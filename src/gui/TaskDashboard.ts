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
                
                if (['openNote', 'toggleSideBar', 'toggleNoteList', 'synchronize', 'toggleMenuBar', 'resetLayout'].includes(message.name)) {
                     const commandArgs = message.payload?.taskId ? [message.payload.taskId] : [];
                     await joplin.commands.execute(message.name, ...commandArgs);
                     return;
                }
                
                if (message.name === 'log') {
                    console.log('React Log:', message.message);
                    return;
                }
            } catch (error) {
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
                this.projectService.invalidateCache();
                await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
            }
        });
    }

    /**
     * Makes the dashboard panel visible if it is currently hidden.
     */
    public async show() {
        if (await joplin.views.panels.visible(this.panelHandle)) return;
        await joplin.views.panels.show(this.panelHandle);
    }

    /**
     * Toggles the visibility of the dashboard panel.
     */
    public async toggle() {
        const isVisible = await joplin.views.panels.visible(this.panelHandle);
        await joplin.views.panels.show(this.panelHandle, !isVisible);
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

                    await this.updateTask(task.id, { subTasks, urgency, dueDate, startDate });
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
            const title = formData.taskTitle;
            const projectId = formData.taskProject;
            
            if (!title || title.trim().length === 0) {
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

            if (payload.urgency && payload.urgency !== Config.TAGS.KEYWORDS.NORMAL) {
                await this.tagService.updatePriorityTags(note.id, payload.urgency);
            } else {
                 await this.tagService.updatePriorityTags(note.id, 'medium');
            }
            
            await joplin.views.dialogs.showToast({ message: "Task created successfully!", duration: 3000, type: ToastType.Success });
            return { success: true };

        } catch (error) {
            console.error('TaskDashboard: Error in createTask:', error);
            await joplin.views.dialogs.showToast({ message: "Error creating task: " + error.message, duration: 3000, type: ToastType.Error });
            return { success: false };
        }
    }

    /**
     * Updates an existing task's body (subtasks), due date, and urgency tags.
     */
    private async updateTask(taskId: string, payload: { subTasks: string[]; urgency: string; dueDate: number; startDate?: number }) {
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

            await updateNote(taskId, { 
                body: body,
                todo_due: payload.dueDate,
                application_data: JSON.stringify(appData)
            });

            await this.tagService.updatePriorityTags(taskId, payload.urgency);

            await joplin.views.dialogs.showToast({ message: "Task updated successfully!", duration: 3000, type: ToastType.Success });
        } catch (error) {
            console.error('TaskDashboard: Error in updateTask:', error);
            await joplin.views.dialogs.showToast({ message: "Error updating task", duration: 3000, type: ToastType.Error });
        }
    }

    /**
     * Updates only the dates of a task directly from Timeline drag-and-drop operations,
     * and cascades the changes to dependent tasks.
     */
    private async updateTaskDates(payload: { taskId: string, startDate: number, dueDate: number, subTasks: string[], urgency: string }) {
        // The original task is fetched first so the time delta can be computed.
        const originalNote = await getNote(payload.taskId, ['todo_due', 'application_data']);
        let originalStart = 0;
        let originalDue = originalNote.todo_due || 0;
        if (originalNote.application_data) {
            try {
                const appData = JSON.parse(originalNote.application_data);
                originalStart = appData['joplin-plugin-projects']?.startDate || 0;
            } catch(e) {}
        }

        // The delta is measured against the due date as the reference point.
        const deltaMs = payload.dueDate - originalDue;

        // updateTask is reused so metadata and tags stay in sync.
        await this.updateTask(payload.taskId, {
            subTasks: payload.subTasks,
            urgency: payload.urgency,
            dueDate: payload.dueDate,
            startDate: payload.startDate
        });

        if (deltaMs !== 0) {
            // A visited set guards against infinite loops caused by circular dependencies.
            const visited = new Set<string>();
            visited.add(payload.taskId);

            // Each task stores the IDs of the tasks it depends on, so the reverse
            // dependencies (tasks depending on the moved one) are found by scanning
            // every task's dependsOn array.
            try {
                const allData = await this.projectService.getDashboardData();
                const allTasks = allData.tasks;
                await this.cascadeTaskUpdate(payload.taskId, deltaMs, allTasks, visited);
            } catch (err) {
                console.error("TaskDashboard: Error in cascading updates", err);
            }
        }

        await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
    }

    /**
     * Recursively shifts dates for tasks that depend on the given taskId.
     * @param sourceTaskId The ID of the task that was moved
     * @param deltaMs The amount of time to shift dependent tasks by
     * @param allTasks The complete list of tasks to query against
     * @param visited Set of task IDs already updated in this chain (prevents circular loops)
     */
    private async cascadeTaskUpdate(sourceTaskId: string, deltaMs: number, allTasks: any[], visited: Set<string>) {
        const dependentTasks = allTasks.filter(t =>
            t.dependsOn && Array.isArray(t.dependsOn) && t.dependsOn.some((d: any) => d.id === sourceTaskId)
        );

        for (const targetTask of dependentTasks) {
            if (visited.has(targetTask.id)) continue;

            const depRelation = targetTask.dependsOn.find((d: any) => d.id === sourceTaskId);
            if (!depRelation) continue;

            const targetStart = targetTask.startDate || targetTask.createdTime;
            const targetDue = targetTask.dueDate || targetStart;

            // Dependent tasks are shifted by the same delta to preserve the relative
            // schedule; computing exact gaps per FS/SS/FF/SF type would be more precise
            // but uniform shifting yields a smoother experience.
            const newTargetStart = targetStart > 0 ? targetStart + deltaMs : targetStart;
            const newTargetDue = targetDue > 0 ? targetDue + deltaMs : targetDue;

            visited.add(targetTask.id);

            await this.updateTask(targetTask.id, {
                // updateTask expects string[]; only the titles are needed to rebuild the markdown.
                subTasks: targetTask.subTasks.map((st: any) => st.title),
                urgency: targetTask.tags.find((t: string) => ['high','medium','normal','low'].includes(t.toLowerCase())) || 'normal',
                dueDate: newTargetDue,
                startDate: newTargetStart
            });

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
}
