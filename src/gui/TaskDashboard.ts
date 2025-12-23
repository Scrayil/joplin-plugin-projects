import joplin from 'api';
import {getSettingValue} from "../utils/utils";
import {Config} from "../utils/constants";
import {createNote} from "../utils/database";
import {ToastType} from "api/types";
import {newTaskDialog} from "./dialogs";

export class TaskDashboard {
    private static instance: TaskDashboard;
    private panelHandle: string;

    private constructor() {
        this.panelHandle = '';
    }

    public static getInstance(): TaskDashboard {
        if (!TaskDashboard.instance) {
            TaskDashboard.instance = new TaskDashboard();
        }
        return TaskDashboard.instance;
    }

    public async register() {
        this.panelHandle = await joplin.views.panels.create('projects_task_dashboard');
        
        // Initial HTML just to hold the root
        await joplin.views.panels.setHtml(this.panelHandle, `
            <div id="root"></div>
        `);

        // Add the CSS and JS
        await joplin.views.panels.addScript(this.panelHandle, './gui/react/style.css');
        await joplin.views.panels.addScript(this.panelHandle, './gui/react/index.js');

        // Handle messages from the React app
        await joplin.views.panels.onMessage(this.panelHandle, async (message: any) => {
            if (message.name === 'getData') {
                return await this.getDashboardData();
            }
            if (message.name === 'openCreateTaskDialog') {
                const formData = await newTaskDialog();
                if (formData) {
                    // Parse form data
                    const title = formData.taskTitle;
                    const projectId = formData.taskProject;
                    const urgency = formData.taskUrgency;
                    const dueDateStr = formData.taskDueDate; // "YYYY-MM-DDTHH:mm"
                    const dueDate = dueDateStr ? new Date(dueDateStr).getTime() : undefined;
                    
                    const subTasksStr = formData.taskSubTasks || "";
                    const subTasks = subTasksStr.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

                    await this.createTask({ title, projectId, subTasks, urgency, dueDate });
                    // Trigger refresh
                    await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
                    return;
                }
                return;
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
            if (message.name === 'log') {
                console.log('React Log:', message.message);
                return;
            }
        });

        // Watch for note changes to update dashboard in real-time
        let debounceTimer: any = null;
        await joplin.workspace.onNoteChange(async (event) => {
            console.log('TaskDashboard: onNoteChange event received', event);
            if (debounceTimer) clearTimeout(debounceTimer);
            
            debounceTimer = setTimeout(async () => {
                const isVisible = await joplin.views.panels.visible(this.panelHandle);
                console.log('TaskDashboard: Debounce triggered. Panel visible:', isVisible);
                
                if (isVisible) {
                    await joplin.views.panels.postMessage(this.panelHandle, { name: 'dataChanged' });
                }
            }, 500); // Debounce for 500ms
        });
    }

    public async show() {
        if (await joplin.views.panels.visible(this.panelHandle)) {
            return;
        }
        await joplin.views.panels.show(this.panelHandle);
    }

    public async toggle() {
        const isVisible = await joplin.views.panels.visible(this.panelHandle);
        await joplin.views.panels.show(this.panelHandle, !isVisible);
    }

    private async updateTaskStatus(payload: { taskId: string, newStatus: string }) {
        const { taskId, newStatus } = payload;
        
        // 1. Handle completion status
        const isCompleted = newStatus === 'done';
        
        // Prepare updates
        const updates: any = {
            todo_completed: isCompleted ? Date.now() : 0 
        };

        // Auto-complete subtasks if moving to done
        // OR Un-complete subtasks if moving out of done
        const note = await joplin.data.get(['notes', taskId], { fields: ['body'] });
        let newBody = note.body;
        if (isCompleted) {
             // Regex to replace - [ ] with - [x]
             newBody = note.body.replace(/- \[ \]/g, '- [x]');
        } else {
             // Moving out of done: uncheck all subtasks
             newBody = note.body.replace(/- \[[xX]\]/g, '- [ ]');
        }

        if (newBody !== note.body) {
            updates.body = newBody;
        }

        await joplin.data.put(['notes', taskId], null, updates);

        // 2. Handle Tags for "In Progress"
        // We need to find the "In Progress" tag ID first
        const search = await joplin.data.get(['search'], { query: 'in progress', type: 'tag' });
        let inProgressTagId = '';
        if (search.items.length > 0) {
            inProgressTagId = search.items[0].id;
        } else {
            // Create if likely needed, or just skip if we don't want to force create
            if (newStatus === 'in_progress') {
                const newTag = await joplin.data.post(['tags'], null, { title: 'In Progress' });
                inProgressTagId = newTag.id;
            }
        }

        if (inProgressTagId) {
            if (newStatus === 'in_progress') {
                // Add tag
                await joplin.data.post(['tags', inProgressTagId, 'notes'], null, { id: taskId });
            } else {
                // Remove tag
                await joplin.data.delete(['tags', inProgressTagId, 'notes', taskId]);
            }
        }

        return { success: true };
    }

    private async toggleSubTask(payload: { taskId: string, subTaskTitle: string, checked: boolean }) {
        const note = await joplin.data.get(['notes', payload.taskId], { fields: ['body'] });
        let body = note.body;
        
        // Regex to match the specific subtask line
        // Escape special regex characters in title
        const escapedTitle = payload.subTaskTitle.replace(/[.*+?^${}()|[\\]/g, '\\$&');
        
        // Pattern: - [ ] Title or - [x] Title
        // We look for the exact line to swap the box
        const regex = new RegExp(`^(\s*-\s*\[)([ xX])(\]\s*${escapedTitle}\s*)$`, 'm');
        
        const match = body.match(regex);
        if (match) {
            const newMark = payload.checked ? 'x' : ' ';
            body = body.replace(regex, `$1${newMark}$3`);
            await joplin.data.put(['notes', payload.taskId], null, { body: body });
        }

        return { success: true };
    }

    private async ensureTag(title: string): Promise<string> {
        const search = await joplin.data.get(['search'], { query: title, type: 'tag' });
        if (search.items.length > 0) {
            return search.items[0].id;
        }
        const newTag = await joplin.data.post(['tags'], null, { title: title });
        return newTag.id;
    }

    private async createTask(payload: { title: string; projectId: string; subTasks?: string[]; urgency?: string; dueDate?: number }) {
        // We need to find the 'Tasks' folder within the project.
        // Assuming the structure is Project -> 🗓️ Tasks (based on template)
        
        // 1. Get children of the project folder
        const projectChildren = await joplin.data.get(['folders'], { parent_id: payload.projectId });
        let tasksFolderId = '';
        
        // Try to find a folder named 'Tasks' or similar
        const tasksFolder = projectChildren.items.find((f: any) => f.title.includes('Tasks') || f.title.includes('To-Do'));
        
        if (tasksFolder) {
            tasksFolderId = tasksFolder.id;
        } else {
            // If no explicit tasks folder, put it in the project root
            tasksFolderId = payload.projectId;
        }

        // 2. Prepare body with sub-tasks
        let body = "";
        if (payload.subTasks && payload.subTasks.length > 0) {
            body = payload.subTasks.map(st => `- [ ] ${st}`).join('\n');
        }

        const note = await createNote(payload.title, body, true, tasksFolderId);

        // Set due date
        if (payload.dueDate) {
            await joplin.data.put(['notes', note.id], null, { todo_due: payload.dueDate });
        }

        // 3. Handle Urgency Tags
        if (payload.urgency && payload.urgency !== 'normal') {
            let tagTitle = '';
            if (payload.urgency === 'high') tagTitle = '🔴 High';
            if (payload.urgency === 'low') tagTitle = '🔵 Low';
            
            if (tagTitle) {
                const tagId = await this.ensureTag(tagTitle);
                await joplin.data.post(['tags', tagId, 'notes'], null, { id: note.id });
            }
        } else if (payload.urgency === 'normal') {
             const tagId = await this.ensureTag('🟡 Medium');
             await joplin.data.post(['tags', tagId, 'notes'], null, { id: note.id });
        }
        
        await joplin.views.dialogs.showToast({ message: "Task created successfully!", duration: 3000, type: ToastType.Success });

        return { success: true };
    }

    private async fetchAllItems(path: string[], query: any = null) {
        let page = 1;
        let items: any[] = [];
        let response;
        
        do {
            const options: any = { page: page, limit: 100 };
            if (query) {
                // For search, options are passed differently depending on endpoint
                // But joplin.data.get(['search']) uses 'query' param
                 Object.assign(options, query);
            }

            response = await joplin.data.get(path, options);
            items = items.concat(response.items);
            page++;
        } while (response.has_more);

        return items;
    }

    private async fetchAllFolders() {
        // Fetch all folders. fields: id, parent_id, title
        return await this.fetchAllItems(['folders'], { fields: ['id', 'parent_id', 'title'] });
    }

    private async fetchNoteTagsMap(): Promise<Map<string, string[]>> {
        const tagMap = new Map<string, string[]>();
        const allTags = await this.fetchAllItems(['tags'], { fields: ['id', 'title'] });
        
        for (const tag of allTags) {
            // Optimization: Only fetch for tags we care about? 
            // For now, fetching all tag associations is safer for general usage
            const taggedNotes = await this.fetchAllItems(['tags', tag.id, 'notes'], { fields: ['id'] });
            taggedNotes.forEach((n: any) => {
                if (!tagMap.has(n.id)) {
                    tagMap.set(n.id, []);
                }
                tagMap.get(n.id)!.push(tag.title);
            });
        }
        return tagMap;
    }

    private parseSubTasks(body: string): { title: string; completed: boolean }[] {
        const subTasks: { title: string; completed: boolean }[] = [];
        if (!body) return subTasks;

        const lines = body.split('\n');
        const regex = /^\s*-\s*\[([ xX])\]\s*(.*)$/;

        for (const line of lines) {
            const match = line.match(regex);
            if (match) {
                subTasks.push({
                    completed: match[1].toLowerCase() === 'x',
                    title: match[2].trim()
                });
            }
        }
        return subTasks;
    }

    private async getDashboardData() {
        const rootId = await getSettingValue(Config.SETTINGS.PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE);
        
        if (!rootId) {
            return { projects: [], tasks: [] };
        }

        const allFolders = await this.fetchAllFolders();
        
        // Identify Project Roots
        const projectFolders = allFolders.filter((f: any) => f.parent_id === rootId);
        
        // Build a map of FolderID -> Project info
        const folderToProjectMap = new Map<string, {id: string, name: string}>();
        
        const mapFolderToProject = (folderId: string, project: {id: string, name: string}) => {
            folderToProjectMap.set(folderId, project);
            const children = allFolders.filter((f: any) => f.parent_id === folderId);
            children.forEach((c: any) => mapFolderToProject(c.id, project));
        };

        projectFolders.forEach((p: any) => mapFolderToProject(p.id, { id: p.id, name: p.title }));

        // Fetch Note Tags Map
        const noteTagsMap = await this.fetchNoteTagsMap();

        // Fetch Tasks directly from folders (bypass Search/FTS for immediate consistency)
        const dashboardTasks: any[] = [];
        
        // We iterate over all folders that belong to a project
        const foldersToScan = Array.from(folderToProjectMap.keys());
        
        // Parallel fetching could be faster but might hit API limits. Serial for safety.
        for (const folderId of foldersToScan) {
            const notes = await this.fetchAllItems(['folders', folderId, 'notes'], {
                fields: ['id', 'parent_id', 'title', 'is_todo', 'todo_completed', 'todo_due', 'body']
            });
            
            for (const n of notes) {
                if (!n.is_todo) continue;

                const project = folderToProjectMap.get(n.parent_id);
                const tags = noteTagsMap.get(n.id) || [];
                const subTasks = this.parseSubTasks(n.body);

                // Determine Status
                let status = 'todo';
                if (n.todo_completed) {
                    status = 'done';
                } else if (tags.some(t => t.toLowerCase() === 'in progress' || t.toLowerCase() === 'doing')) {
                    status = 'in_progress';
                } else if (n.todo_due && n.todo_due < Date.now()) {
                    // status = 'overdue'; // Optional: separate overdue status or keep as todo
                    // We keep it as todo but frontend handles styling
                }

                dashboardTasks.push({
                    id: n.id,
                    title: n.title,
                    status: status,
                    dueDate: n.todo_due,
                    projectId: project?.id,
                    projectName: project?.name,
                    tags: tags,
                    subTasks: subTasks
                });
            }
        }

        return {
            projects: projectFolders.map((p: any) => ({ id: p.id, name: p.title })),
            tasks: dashboardTasks
        };
    }
}