import joplin from 'api';
import { ToastType } from "api/types";
import { Config } from "../utils/constants";
import { createNote, updateNote, getNote, deleteNote } from "../utils/database";
import { newTaskDialog, editTaskDialog, newProjectDialog } from "./dialogs";
import { getAllProjects } from "../utils/projects";
import { NoteParser } from '../services/NoteParser';
import { TagService } from '../services/TagService';
import { ProjectService } from '../services/ProjectService';

/**
 * Controller class for the Task Dashboard panel.
 * Handles IPC messages from the React frontend and delegates business logic to specialized services.
 */
export class TaskDashboard {
    private static instance: TaskDashboard;
    private panelHandle: string;
    
    private noteParser: NoteParser;
    private tagService: TagService;
    private projectService: ProjectService;

    private constructor() {
        this.panelHandle = '';
        this.noteParser = new NoteParser();
        this.tagService = new TagService();
        this.projectService = new ProjectService();
    }

    /**
     * Returns the singleton instance, creating it on first access.
     */
    public static getInstance(): TaskDashboard {
        if (!TaskDashboard.instance) {
            TaskDashboard.instance = new TaskDashboard();
        }
        return TaskDashboard.instance;
    }

    /**
     * Registers the panel view and sets up message listeners.
     */
    public async register() {
        this.panelHandle = await joplin.views.panels.create('projects_task_dashboard');
        
        await joplin.views.panels.setHtml(this.panelHandle, `
            <div id="root"></div>
        `);

        await joplin.views.panels.addScript(this.panelHandle, './gui/react/style.css');
        await joplin.views.panels.addScript(this.panelHandle, './gui/react/highlight.css');
        await joplin.views.panels.addScript(this.panelHandle, './gui/react/index.js');

        await joplin.views.panels.onMessage(this.panelHandle, async (message: any) => {
            try {
                if (message.name === 'getData') {
                    return await this.projectService.getDashboardData();
                }
                if (message.name === 'getWikiData') {
                    return await this.projectService.getProjectWiki(message.payload.projectId);
                }
                if (message.name === 'saveWikiOrder') {
                    const { projectId, parentId, orderedIds } = message.payload;
                    return await this.projectService.saveWikiOrder(projectId, parentId, orderedIds);
                }
                if (message.name === 'openEditTaskDialog') {
                    return await this.handleEditTaskDialog(message.payload.task);
                }
                if (message.name === 'openCreateTaskDialog') {
                    return await this.handleCreateTaskDialog(message.payload?.projectId);
                }
                if (message.name === 'createTask') {
                    return await this.createTask(message.payload);
                }
                if (message.name === 'deleteTask') {
                    return await this.handleDeleteTaskWithConfirmation(message.payload.task);
                }
                if (message.name === 'openItem' || message.name === 'openExternal') {
                    return await joplin.commands.execute('openItem', message.payload);
                }
                if (message.name === 'updateTaskStatus') {
                    return await this.updateTaskStatus(message.payload);
                }
                if (message.name === 'updateTaskDates') {
                    return await this.updateTaskDates(message.payload);
                }
                if (message.name === 'updateTaskDependencies') {
                    return await this.updateTaskDependencies(message.payload.taskId, message.payload.dependsOn);
                }
                if (message.name === 'toggleSubTask') {
                    return await this.toggleSubTask(message.payload);
                }
                if (message.name === 'toggleWikiCheckbox') {
                    return await this.toggleWikiCheckbox(message.payload);
                }

                if (['openNote', 'toggleSideBar', 'toggleNoteList', 'synchronize', 'toggleMenuBar', 'resetLayout'].includes(message.name)) {
                     const commandArgs = message.payload?.taskId ? [message.payload.taskId] : [];
                     await joplin.commands.execute(message.name, ...commandArgs);
                     return;
                }
                
                if (message.name === 'showToast') {
                    const toastTypes: { [key: string]: ToastType } = {
                        error: ToastType.Error,
                        success: ToastType.Success,
                        info: ToastType.Info
                    };
                    await joplin.views.dialogs.showToast({
                        message: message.payload?.message || '',
                        duration: message.payload?.duration || 4000,
                        type: toastTypes[message.payload?.type] || ToastType.Info
                    });
                    return;
                }

                if (message.name === 'log') {
                    console.log('React Log:', message.message);
                    return;
                }
            } catch (error) {
                // Prints the error in the plugin's own console
                console.error(`TaskDashboard: Error handling message ${message.name}:`, error);
            }
        });

        this.registerNoteWatcher();
    }

    /**
     * Sets up a listener for global note changes to trigger dashboard updates.
     * Uses a debounce mechanism to prevent excessive refreshes.
     */
    private async registerNoteWatcher() {
        let debounceTimer: any = null;
        await joplin.workspace.onNoteChange(async (event) => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const isVisible = await joplin.views.panels.visible(this.panelHandle);
                if (isVisible) {
                    this.projectService.invalidateCache();
                    await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
                }
            }, 500); 
        });

        await joplin.workspace.onNoteSelectionChange(async () => {
            const isVisible = await joplin.views.panels.visible(this.panelHandle);
            if (isVisible) {
                await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
            }
        });
    }

    /**
     * Signals the webview to reset its view state, so reopening the dashboard from a fully
     * hidden state starts on a clean view rather than restoring the previous scroll and tab.
     */
    private async notifyDashboardReset() {
        await joplin.views.panels.postMessage(this.panelHandle, { name: 'dashboardReset' });
    }

    /**
     * Makes the dashboard panel visible if it is currently hidden.
     */
    public async show() {
        if (await joplin.views.panels.visible(this.panelHandle)) return;
        await joplin.views.panels.show(this.panelHandle);
        await this.notifyDashboardReset();
    }

    /**
     * Toggles the visibility of the dashboard panel.
     */
    public async toggle() {
        const isVisible = await joplin.views.panels.visible(this.panelHandle);
        await joplin.views.panels.show(this.panelHandle, !isVisible);
        if (!isVisible) {
            await this.notifyDashboardReset();
        }
    }

    /**
     * Handles the dialog flow for editing an existing task.
     */
    private async handleEditTaskDialog(task: any) {
        try {
            const result = await editTaskDialog(task);
            
            if (result) {
                if (result.action === 'save') {
                    const formData = result.data;
                    const title = (formData.taskTitle || '').trim();
                    if (!title) {
                        await joplin.views.dialogs.showToast({ message: "Task title required", duration: 3000, type: ToastType.Error });
                        return;
                    }
                    const urgency = formData.taskUrgency;
                    const dueDateStr = formData.taskDueDate;
                    let dueDate = dueDateStr ? new Date(dueDateStr).getTime() : 0;
                    if (!Number.isFinite(dueDate)) dueDate = 0;

                    const startDateStr = formData.taskStartDate;
                    let startDate = startDateStr ? new Date(startDateStr).getTime() : 0;
                    if (!Number.isFinite(startDate)) startDate = 0;

                    if (startDate > 0 && dueDate > 0 && startDate > dueDate) {
                         await joplin.views.dialogs.showToast({ message: "Start Date cannot be after Due Date", duration: 3000, type: ToastType.Error });
                         return;
                    }

                    const subTasksStr = formData.taskSubTasks || "";
                    // Preserve leading indentation for nested tasks, only trim trailing whitespace
                    const subTasks = subTasksStr.split('\n')
                        .map((s: string) => s.replace(/\s+$/, ''))
                        .filter((s: string) => s.trim().length > 0);

                    await this.updateTask(task.id, { title, subTasks, urgency, dueDate, startDate });
                } else if (result.action === 'delete') {
                    await this.handleDeleteTaskWithConfirmation(task);
                } else if (result.action === 'text_edit') {
                     await joplin.commands.execute('openNote', task.id);
                     return;
                }
                await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
            } else {
                await joplin.views.dialogs.showToast({ message: "Task edit canceled", duration: 3000, type: ToastType.Info });
            }
        } catch (error) {
            console.error('TaskDashboard: Error in edit dialog handler:', error);
            await joplin.views.dialogs.showToast({ message: "Error: " + error.message, duration: 3000, type: ToastType.Error });
        }
    }

    /**
     * Prompts the user for confirmation before deleting a task note.
     * If confirmed, deletes the note and refreshes the dashboard.
     * @param task The task object to delete.
     */
    private async handleDeleteTaskWithConfirmation(task: any) {
        const confirmed = await joplin.views.dialogs.showMessageBox(`Are you sure you want to delete the task "${task.title}"?`);
        if (confirmed === 0) {
            await deleteNote(task.id);
            await joplin.views.dialogs.showToast({ message: "Task deleted successfully", duration: 3000, type: ToastType.Success });
            await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
        } else {
            await joplin.views.dialogs.showToast({ message: "Task deletion canceled", duration: 3000, type: ToastType.Info });
        }
    }

    /**
     * Handles the dialog flow for creating a new task, including optional project creation.
     */
    private async handleCreateTaskDialog(defaultProjectId?: string) {
         const projects = await getAllProjects();
         if (projects.length === 0) {
            await newProjectDialog();
            return;
         }

        const formData = await newTaskDialog(defaultProjectId);
        if (formData) {
            const title = (formData.taskTitle || '').trim();
            const projectId = formData.taskProject;

            if (!title) {
                await joplin.views.dialogs.showToast({ message: "Task title required", duration: 3000, type: ToastType.Error });
                return;
            }

            const urgency = formData.taskUrgency;
            const dueDateStr = formData.taskDueDate; 
            let dueDate = dueDateStr ? new Date(dueDateStr).getTime() : undefined;
            if (dueDate !== undefined && !Number.isFinite(dueDate)) dueDate = undefined;

            const startDateStr = formData.taskStartDate;
            let startDate = startDateStr ? new Date(startDateStr).getTime() : undefined;
            if (startDate !== undefined && !Number.isFinite(startDate)) startDate = undefined;

            if (startDate && dueDate && startDate > dueDate) {
                 await joplin.views.dialogs.showToast({ message: "Start Date cannot be after Due Date", duration: 3000, type: ToastType.Error });
                 return;
            }

            const subTasksStr = formData.taskSubTasks || "";
            // Process subtasks: Trim RIGHT only to preserve indentation, Filter empty, and Auto-Linkify
            const subTasks = subTasksStr.split('\n')
                .map((s: string) => s.replace(/\s+$/, ''))
                .filter((s: string) => s.trim().length > 0)
                .map((s: string) => {
                    // Matches bare http/https URLs that are not already part of a markdown
                    // link or an HTML attribute, stopping before common trailing punctuation.
                    const urlRegex = /(?<!\]\()(?<!=\")(?<!href=\")\b(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
                    return s.replace(urlRegex, '[$1]($1)');
                });

            await this.createTask({ title, projectId, subTasks, urgency, dueDate, startDate });
            await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
        } else {
            await joplin.views.dialogs.showToast({ message: "Task creation canceled", duration: 3000, type: ToastType.Info });
        }
    }

    /**
     * Creates a new task note in the appropriate folder and applies initial tags.
     */
    private async createTask(payload: { title: string; projectId: string; subTasks?: string[]; urgency?: string; dueDate?: number; startDate?: number }) {
        try {
            const tasksFolderId = await this.projectService.getTasksFolderForProject(payload.projectId);
            const body = this.noteParser.createBodyFromSubTasks(payload.subTasks || []);

            const note = await createNote(payload.title, body, true, tasksFolderId);

            let updates: any = {};
            if (payload.dueDate) {
                updates.todo_due = payload.dueDate;
            }

            if (payload.startDate) {
                updates.application_data = JSON.stringify({
                    'joplin-plugin-projects': { startDate: payload.startDate }
                });
            }

            if (Object.keys(updates).length > 0) {
                await updateNote(note.id, updates);
            }

            await this.tagService.updatePriorityTags(note.id, payload.urgency || Config.TAGS.KEYWORDS.MEDIUM);
            
            await joplin.views.dialogs.showToast({ message: "Task created successfully!", duration: 3000, type: ToastType.Success });
            return { success: true };

        } catch (error) {
            console.error('TaskDashboard: Error in createTask:', error);
            await joplin.views.dialogs.showToast({ message: "Error creating task: " + error.message, duration: 3000, type: ToastType.Error });
            return { success: false };
        }
    }

    /**
     * Updates an existing task's title, body (subtasks), due date, and urgency tags.
     */
    private async updateTask(taskId: string, payload: { title?: string; subTasks: string[]; urgency: string; dueDate: number; startDate?: number }) {
        try {
            // Retrieve existing body to merge updates without data loss
            const currentNote = await getNote(taskId, ['body', 'application_data']);
            const body = this.noteParser.updateNoteBodyWithSubTasks(currentNote.body, payload.subTasks);

            let appData: any = {};
            if (currentNote.application_data) {
                try {
                    appData = JSON.parse(currentNote.application_data);
                } catch(e) {
                    console.warn(`TaskDashboard: Failed to parse application_data for note ${taskId}`);
                }
            }

            if (!appData['joplin-plugin-projects']) {
                appData['joplin-plugin-projects'] = {};
            }

            if (payload.startDate && payload.startDate > 0) {
                appData['joplin-plugin-projects'].startDate = payload.startDate;
            } else {
                delete appData['joplin-plugin-projects'].startDate;
            }

            const updates: any = {
                body: body,
                todo_due: payload.dueDate,
                application_data: JSON.stringify(appData)
            };
            if (payload.title && payload.title.trim().length > 0) {
                updates.title = payload.title.trim();
            }
            await updateNote(taskId, updates);

            await this.tagService.updatePriorityTags(taskId, payload.urgency);

            await joplin.views.dialogs.showToast({ message: "Task updated successfully!", duration: 3000, type: ToastType.Success });
        } catch (error) {
            console.error('TaskDashboard: Error in updateTask:', error);
            await joplin.views.dialogs.showToast({ message: "Error updating task", duration: 3000, type: ToastType.Error });
        }
    }

    /**
     * Writes the dates of a task dropped or resized on the Timeline, then shifts the tasks
     * that depend on it by the same amount.
     *
     * Only the dates are written: the note body, the tags and therefore the urgency are
     * left untouched (#53). No success toast is shown. Any failure is reported with a
     * single error toast, and the dashboard is refreshed in every case so it reflects
     * what was actually saved. Dependents already shifted before a failure keep their
     * new dates, since the Data API offers no transaction to roll them back.
     *
     * @param payload The task ID and its new start and due dates, in milliseconds since
     *   the epoch. A start date of 0 removes the stored start date.
     */
    private async updateTaskDates(payload: { taskId: string, startDate: number, dueDate: number }) {
        try {
            const originalNote = await getNote(payload.taskId, ['todo_due']);
            // The due date is the reference point for the shift applied to dependents.
            const deltaMs = payload.dueDate - (originalNote.todo_due || 0);

            await this.writeTaskDates(payload.taskId, payload.startDate, payload.dueDate);

            if (deltaMs !== 0) {
                const allTasks = (await this.projectService.getDashboardData()).tasks;
                // The visited set guards against circular dependencies.
                const visited = new Set<string>([payload.taskId]);
                await this.cascadeTaskUpdate(payload.taskId, deltaMs, allTasks, visited);
            }
        } catch (error) {
            console.error('TaskDashboard: Error updating task dates:', error);
            await joplin.views.dialogs.showToast({ message: "Error updating task dates", duration: 3000, type: ToastType.Error });
        } finally {
            await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
        }
    }

    /**
     * Writes the due date and the start date of a task, and nothing else.
     *
     * The start date lives in the plugin namespace of the note application_data; any
     * other key stored there is preserved. Errors are not caught here, so the caller
     * decides how to report them.
     *
     * @param taskId The ID of the task note.
     * @param startDate The start date in milliseconds since the epoch, or 0 to remove it.
     * @param dueDate The due date in milliseconds since the epoch, or 0 for no due date.
     * @throws When the note cannot be read or written, or its application_data holds
     *   invalid JSON (overwriting it would discard data written by others).
     */
    private async writeTaskDates(taskId: string, startDate: number, dueDate: number): Promise<void> {
        const note = await getNote(taskId, ['application_data']);
        const appData = note.application_data ? JSON.parse(note.application_data) : {};
        const pluginData = appData['joplin-plugin-projects'] || {};

        if (startDate > 0) {
            pluginData.startDate = startDate;
        } else {
            delete pluginData.startDate;
        }
        appData['joplin-plugin-projects'] = pluginData;

        await updateNote(taskId, {
            todo_due: dueDate,
            application_data: JSON.stringify(appData)
        });
    }

    /**
     * Recursively shifts the dates of the tasks that depend on the given task. Only the
     * dates are written, through writeTaskDates.
     *
     * Every dependent is shifted by the same delta, whatever its dependency type, so the
     * relative schedule is preserved. The dates are resolved as the Timeline draws them:
     * a missing start date falls back to the creation time, a missing due date to the
     * start date.
     *
     * @param sourceTaskId The ID of the task that was moved.
     * @param deltaMs The amount of time, in milliseconds, to shift dependent tasks by.
     * @param allTasks The complete list of dashboard tasks, read before the shift.
     * @param visited The IDs already shifted in this chain, which prevents circular loops.
     * @throws When a dependent task cannot be written; the remaining ones are not shifted.
     */
    private async cascadeTaskUpdate(sourceTaskId: string, deltaMs: number, allTasks: any[], visited: Set<string>) {
        const dependentTasks = allTasks.filter(t =>
            t.dependsOn && Array.isArray(t.dependsOn) && t.dependsOn.some((d: any) => d.id === sourceTaskId)
        );

        for (const targetTask of dependentTasks) {
            if (visited.has(targetTask.id)) continue;
            visited.add(targetTask.id);

            const targetStart = targetTask.startDate || targetTask.createdTime;
            const targetDue = targetTask.dueDate || targetStart;

            await this.writeTaskDates(
                targetTask.id,
                targetStart > 0 ? targetStart + deltaMs : targetStart,
                targetDue > 0 ? targetDue + deltaMs : targetDue
            );

            await this.cascadeTaskUpdate(targetTask.id, deltaMs, allTasks, visited);
        }
    }

    /**
     * Updates the completion status of a task, synchronizes its subtask checkboxes,
     * and updates its status tags.
     */
    private async updateTaskStatus(payload: { taskId: string, newStatus: string }) {
        const { taskId, newStatus } = payload;

        const note = await getNote(taskId, ['body', 'todo_completed']);
        const isCompleted = newStatus === 'done';
        const wasCompleted = !!note.todo_completed;

        const updates: any = {
            todo_completed: isCompleted ? Date.now() : 0
        };

        // Subtasks are only synced when entering or leaving the 'done' state;
        // transitions between 'todo' and 'in_progress' leave them untouched.
        if (isCompleted || wasCompleted) {
            const newBody = this.noteParser.updateAllSubTasks(note.body, isCompleted);
            if (newBody !== note.body) {
                updates.body = newBody;
            }
        }

        await updateNote(taskId, updates);
        await this.tagService.updateStatusTags(taskId, newStatus);

        return { success: true };
    }

    /**
     * Updates the task dependencies (dependsOn array) in the application_data.
     */
    private async updateTaskDependencies(taskId: string, dependsOn: { id: string, type: 'FS'|'SS'|'FF'|'SF' }[]) {
        try {
            const currentNote = await getNote(taskId, ['application_data']);
            let appData: any = {};
            if (currentNote.application_data) {
                try {
                    appData = JSON.parse(currentNote.application_data);
                } catch(e) {
                    console.warn(`TaskDashboard: Failed to parse application_data for note ${taskId}`);
                }
            }

            if (!appData['joplin-plugin-projects']) {
                appData['joplin-plugin-projects'] = {};
            }

            if (dependsOn && dependsOn.length > 0) {
                appData['joplin-plugin-projects'].dependsOn = dependsOn;
            } else {
                delete appData['joplin-plugin-projects'].dependsOn;
            }

            await updateNote(taskId, {
                application_data: JSON.stringify(appData)
            });
            this.projectService.invalidateCache();
            await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
            return { success: true };
        } catch (error) {
            console.error('TaskDashboard: Error in updateTaskDependencies:', error);
            await joplin.views.dialogs.showToast({ message: "Error updating dependencies", duration: 3000, type: ToastType.Error });
            return { success: false };
        }
    }

    /**
     * Toggles a specific subtask checkbox within the note markdown body.
     */
    private async toggleSubTask(payload: { taskId: string, subTaskIndex: number, checked: boolean }) {
        const note = await getNote(payload.taskId, ['body']);
        // Subtasks are addressed by index rather than title to stay robust against duplicate titles.
        const newBody = this.noteParser.updateSubTaskStatus(note.body, payload.subTaskIndex, payload.checked);
        
        if (newBody !== note.body) {
            await updateNote(payload.taskId, { body: newBody });
        }

        return { success: true };
    }

    /**
     * Toggles a single plain checkbox by index within any note body, used by the Wiki
     * reader for note checklists that are not task subtasks, then refreshes the dashboard.
     */
    private async toggleWikiCheckbox(payload: { noteId: string, index: number, checked: boolean }) {
        const note = await getNote(payload.noteId, ['body']);
        const newBody = this.noteParser.toggleCheckboxAt(note.body, payload.index, payload.checked);

        if (newBody !== note.body) {
            await updateNote(payload.noteId, { body: newBody });
            this.projectService.invalidateCache();
            await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
        }

        return { success: true };
    }
}
