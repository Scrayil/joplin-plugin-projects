import joplin from 'api';
import { Config } from '../utils/constants';
import { getSettingValue } from '../utils/utils';
import { TagService } from './TagService';
import { NoteParser } from './NoteParser';

export class ProjectService {
    private tagService: TagService;
    private noteParser: NoteParser;

    constructor() {
        this.tagService = new TagService();
        this.noteParser = new NoteParser();
    }

    public async getDashboardData() {
        const rootId = await getSettingValue(Config.SETTINGS.PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE);
        
        if (!rootId) {
            return { projects: [], tasks: [] };
        }

        const allFolders = await this.fetchAllFolders();
        
        // Identify Project Roots (folders directly under the configured root)
        const projectFolders = allFolders.filter((f: any) => f.parent_id === rootId);
        
        // Build a map of FolderID -> Project info
        const folderToProjectMap = new Map<string, {id: string, name: string}>();
        
        // Recursive function to map folders to their project
        const mapFolderToProject = (folderId: string, project: {id: string, name: string}, isInsideTasks: boolean) => {
            const folder = allFolders.find((f: any) => f.id === folderId);
            if (!folder) return;

            const currentIsTasks = isInsideTasks || folder.title.includes(Config.FOLDERS.TASKS);

            if (currentIsTasks) {
                folderToProjectMap.set(folderId, project);
            }

            const children = allFolders.filter((f: any) => f.parent_id === folderId);
            children.forEach((c: any) => mapFolderToProject(c.id, project, currentIsTasks));
        };

        projectFolders.forEach((p: any) => mapFolderToProject(p.id, { id: p.id, name: p.title }, false));

        const dashboardTasks: any[] = [];
        const foldersToScan = Array.from(folderToProjectMap.keys());
        
        // 1. Fetch all notes from all relevant folders
        let allNotes: any[] = [];
        for (const folderId of foldersToScan) {
            const notes = await this.fetchAllItems(['folders', folderId, 'notes'], {
                fields: ['id', 'parent_id', 'title', 'is_todo', 'todo_completed', 'todo_due', 'body', 'created_time']
            });
            allNotes = allNotes.concat(notes.filter((n: any) => n.is_todo));
        }

        // 2. Fetch tags for all these notes efficiently (Batching)
        const noteIds = allNotes.map(n => n.id);
        const tagsMap = await this.tagService.getTagsForNotes(noteIds);

        // 3. Assemble Dashboard Data
        for (const n of allNotes) {
            const project = folderToProjectMap.get(n.parent_id);
            const tags = tagsMap.get(n.id) || [];
            const subTasks = this.noteParser.parseSubTasks(n.body);

            // Determine Status
            let status = 'todo';
            if (n.todo_completed) {
                status = 'done';
            } else if (tags.some((t: string) => 
                t.toLowerCase() === Config.TAGS.KEYWORDS.IN_PROGRESS || 
                t.toLowerCase() === Config.TAGS.KEYWORDS.DOING
            )) {
                status = 'in_progress';
            }

            dashboardTasks.push({
                id: n.id,
                title: n.title,
                status: status,
                dueDate: n.todo_due,
                createdTime: n.created_time,
                projectId: project?.id,
                projectName: project?.name,
                tags: tags,
                subTasks: subTasks
            });
        }

        return {
            projects: projectFolders.map((p: any) => ({ id: p.id, name: p.title })),
            tasks: dashboardTasks
        };
    }

    private async fetchAllItems(path: string[], query: any = null) {
        let page = 1;
        let items: any[] = [];
        let response;
        
        do {
            const options: any = { page: page, limit: 100 };
            if (query) {
                 Object.assign(options, query);
            }
            response = await joplin.data.get(path, options);
            items = items.concat(response.items);
            page++;
        } while (response.has_more);

        return items;
    }

    private async fetchAllFolders() {
        return await this.fetchAllItems(['folders'], { fields: ['id', 'parent_id', 'title'] });
    }
    
    // Helper to find the specific 'Tasks' folder for a project to save new tasks
    public async getTasksFolderForProject(projectId: string): Promise<string> {
        const allFolders = await this.fetchAllFolders();
        const projectFolders = allFolders.filter((f: any) => f.parent_id === projectId);
        
        const tasksFolder = projectFolders.find((f: any) => f.title.includes(Config.FOLDERS.TASKS));
        
        if (tasksFolder) {
            return tasksFolder.id;
        } else {
            return projectId; // Fallback to project root
        }
    }
}
