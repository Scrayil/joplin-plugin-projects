import joplin from 'api';
import { ToastType } from "api/types";
import { Config } from "../utils/constants";
import { createNote } from "../utils/database";
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
        await joplin.views.panels.addScript(this.panelHandle, './gui/react/index.js');

        await joplin.views.panels.onMessage(this.panelHandle, async (message: any) => {
            try {
                if (message.name === 'getData') {
                    return await this.projectService.getDashboardData();
                }
                if (message.name === 'openEditTaskDialog') {
                    return await this.handleEditTaskDialog(message.payload.task);
                }
                if (message.name === 'openCreateTaskDialog') {
                    return await this.handleCreateTaskDialog();
                }
                if (message.name === 'createTask') {
                    return await this.createTask(message.payload);
                }
                if (message.name === 'updateTaskStatus') {
                    return await this.updateTaskStatus(message.payload);
                }
                if (message.name === 'toggleSubTask') {
                    return await this.toggleSubTask(message.payload);
                }
                
                if (['openNote', 'toggleSideBar', 'toggleNoteList', 'synchronize', 'toggleMenuBar'].includes(message.name)) {
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
                    await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
                }
            }, 500); 
        });
    }

    public async show() {
        if (await joplin.views.panels.visible(this.panelHandle)) return;
        await joplin.views.panels.show(this.panelHandle);
    }

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
                    const dueDate = dueDateStr ? new Date(dueDateStr).getTime() : 0;
                    const subTasksStr = formData.taskSubTasks || "";
                    const subTasks = subTasksStr.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

                    await this.updateTask(task.id, { subTasks, urgency, dueDate });
                } else if (result.action === 'delete') {
                    const confirmed = await joplin.views.dialogs.showMessageBox(`Are you sure you want to delete the task "${task.title}"?`);
                    if (confirmed === 0) {
                        await joplin.data.delete(['notes', task.id]);
                        await joplin.views.dialogs.showToast({ message: "Task deleted successfully", duration: 3000, type: ToastType.Success });
                    } else {
                        await joplin.views.dialogs.showToast({ message: "Task deletion canceled", duration: 3000, type: ToastType.Info });
                        return;
                    }
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
     * Handles the dialog flow for creating a new task, including optional project creation.
     */
    private async handleCreateTaskDialog() {
         const projects = await getAllProjects();
         if (projects.length === 0) {
            await newProjectDialog();
            return;
         }

        const formData = await newTaskDialog();
        if (formData) {
            const title = formData.taskTitle;
            const projectId = formData.taskProject;
            
            if (!title || title.trim().length === 0) {
                await joplin.views.dialogs.showToast({ message: "Task title required", duration: 3000, type: ToastType.Error });
                return;
            }

            const urgency = formData.taskUrgency;
            const dueDateStr = formData.taskDueDate; 
            const dueDate = dueDateStr ? new Date(dueDateStr).getTime() : undefined;
            const subTasksStr = formData.taskSubTasks || "";
            const subTasks = subTasksStr.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

            await this.createTask({ title, projectId, subTasks, urgency, dueDate });
            await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
        } else {
            await joplin.views.dialogs.showToast({ message: "Task creation canceled", duration: 3000, type: ToastType.Info });
        }
    }

    private async createTask(payload: { title: string; projectId: string; subTasks?: string[]; urgency?: string; dueDate?: number }) {
        try {
            const tasksFolderId = await this.projectService.getTasksFolderForProject(payload.projectId);
            const body = this.noteParser.createBodyFromSubTasks(payload.subTasks || []);

            const note = await createNote(payload.title, body, true, tasksFolderId);

            if (payload.dueDate) {
                await joplin.data.put(['notes', note.id], null, { todo_due: payload.dueDate });
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

    private async updateTask(taskId: string, payload: { subTasks: string[]; urgency: string; dueDate: number }) {
        try {
            const body = this.noteParser.createBodyFromSubTasks(payload.subTasks);
            await joplin.data.put(['notes', taskId], null, { 
                body: body,
                todo_due: payload.dueDate
            });

            await this.tagService.updatePriorityTags(taskId, payload.urgency);

            await joplin.views.dialogs.showToast({ message: "Task updated successfully!", duration: 3000, type: ToastType.Success });
        } catch (error) {
            console.error('TaskDashboard: Error in updateTask:', error);
            await joplin.views.dialogs.showToast({ message: "Error updating task", duration: 3000, type: ToastType.Error });
        }
    }

    private async updateTaskStatus(payload: { taskId: string, newStatus: string }) {
        const { taskId, newStatus } = payload;
        
        const note = await joplin.data.get(['notes', taskId], { fields: ['body', 'todo_completed'] });
        const isCompleted = newStatus === 'done';
        
        const updates: any = {
            todo_completed: isCompleted ? Date.now() : 0 
        };

        const newBody = this.noteParser.updateAllSubTasks(note.body, isCompleted);
        if (newBody !== note.body) {
            updates.body = newBody;
        }

        await joplin.data.put(['notes', taskId], null, updates);
        await this.tagService.updateStatusTags(taskId, newStatus);

        return { success: true };
    }

    private async toggleSubTask(payload: { taskId: string, subTaskTitle: string, checked: boolean }) {
        const note = await joplin.data.get(['notes', payload.taskId], { fields: ['body'] });
        const newBody = this.noteParser.updateSubTaskStatus(note.body, payload.subTaskTitle, payload.checked);
        
        if (newBody !== note.body) {
            await joplin.data.put(['notes', payload.taskId], null, { body: newBody });
        }

        return { success: true };
    }
}