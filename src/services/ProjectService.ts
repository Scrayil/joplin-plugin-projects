import joplin from 'api';
import { Config } from '../utils/constants';
import { getPluginDataFolder, readFileContent } from '../utils/utils';
import { TagService } from './TagService';
import { NoteParser } from './NoteParser';
import * as path from 'path';
import * as fs from 'fs';
import { PersistenceService } from './PersistenceService';

/**
 * Service responsible for aggregating project data, scanning folders, and maintaining the dashboard state.
 * Implements a smart caching strategy to minimize API load during frequent polling.
 */
export class ProjectService {
    private tagService: TagService;
    private noteParser: NoteParser;
    private projectMeta: { [key: string]: string } = {};
    private dashboardCache: any = null;
    private lastSignature: string = '';

    constructor() {
        this.tagService = new TagService();
        this.noteParser = new NoteParser();
        this.loadProjectMeta();
    }

    /**
     * Loads the persistent mapping of Project IDs to their specific Task Folder IDs.
     * This ensures the plugin can locate tasks even if folders are renamed.
     */
    private async loadProjectMeta() {
        try {
            const dataFolder = await getPluginDataFolder();
            const metaPath = path.join(dataFolder, "project_meta.json");
            
            if (fs.existsSync(metaPath)) {
                const content = await readFileContent(metaPath);
                if (content) {
                    this.projectMeta = JSON.parse(content);
                }
            }
        } catch (error) {
            console.error("ProjectService: Error loading project meta", error);
        }
    }

    /**
     * Retrieves the complete data structure for the dashboard (projects and tasks).
     * 
     * Strategy:
     * 1. Performs a lightweight scan of folder structure and task metadata.
     * 2. Computes a "signature" based on the task count and maximum `updated_time`.
     * 3. If the signature matches the cache, returns cached data immediately.
     * 4. If data has changed, performs a full fetch of note bodies and tags.
     */
    public async getDashboardData() {
        await this.loadProjectMeta();

        const rootId = await PersistenceService.getInstance().getValue('projects_root_id');
        
        if (!rootId) {
            return { projects: [], tasks: [] };
        }

        const allFolders = await this.fetchAllFolders(['id', 'parent_id', 'title']);
        
        const projectFolders = allFolders.filter((f: any) => f.parent_id === rootId);
        
        const folderToProjectMap = new Map<string, {id: string, name: string}>();
        
        const mapFolderToProject = (folderId: string, project: {id: string, name: string}, isInsideTasks: boolean) => {
            const folder = allFolders.find((f: any) => f.id === folderId);
            if (!folder) return;

            let currentIsTasks = isInsideTasks;
            if (!currentIsTasks) {
                if (this.projectMeta[project.id] === folderId) {
                    currentIsTasks = true;
                } else if (folder.title.includes(Config.FOLDERS.TASKS)) {
                    currentIsTasks = true;
                }
            }

            if (currentIsTasks) {
                folderToProjectMap.set(folderId, project);
            }

            const children = allFolders.filter((f: any) => f.parent_id === folderId);
            children.forEach((c: any) => mapFolderToProject(c.id, project, currentIsTasks));
        };

        projectFolders.forEach((p: any) => mapFolderToProject(p.id, { id: p.id, name: p.title }, false));

        const foldersToScan = Array.from(folderToProjectMap.keys());
        let validTodosMetadata: any[] = [];
        let maxUpdated = 0;

        for (const folderId of foldersToScan) {
            const notes = await this.fetchAllItems(['folders', folderId, 'notes'], {
                fields: ['id', 'updated_time', 'is_todo', 'parent_id']
            });
            const todos = notes.filter((n: any) => n.is_todo);
            validTodosMetadata = validTodosMetadata.concat(todos);
            
            todos.forEach((n: any) => {
                if (n.updated_time > maxUpdated) maxUpdated = n.updated_time;
            });
        }

        const currentSignature = `${validTodosMetadata.length}-${maxUpdated}`;
        
        if (this.dashboardCache && currentSignature === this.lastSignature) {
            return this.dashboardCache;
        }

        let fullNotes: any[] = [];
        
        for (const folderId of foldersToScan) {
            const notes = await this.fetchAllItems(['folders', folderId, 'notes'], {
                fields: ['id', 'parent_id', 'title', 'is_todo', 'todo_completed', 'todo_due', 'body', 'created_time', 'updated_time']
            });
            fullNotes = fullNotes.concat(notes.filter((n: any) => n.is_todo));
        }

        const noteIds = fullNotes.map(n => n.id);
        const tagsMap = await this.tagService.getTagsForNotes(noteIds);

        const dashboardTasks: any[] = [];
        for (const n of fullNotes) {
            const project = folderToProjectMap.get(n.parent_id);
            const tags = tagsMap.get(n.id) || [];
            const subTasks = this.noteParser.parseSubTasks(n.body);

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

        const data = {
            projects: projectFolders.map((p: any) => ({ id: p.id, name: p.title })),
            tasks: dashboardTasks,
            config: {
                pollingInterval: 3000 // Hardcoded as per request "Remove the only remaining setting"
            }
        };
        
        this.dashboardCache = data;
        this.lastSignature = currentSignature;
        
        return data;
    }

    /**
     * Generic helper to fetch all items from the Joplin Data API, handling pagination automatically.
     * 
     * @param path The API path segments (e.g., ['folders'] or ['folders', id, 'notes']).
     * @param query Optional query parameters.
     * @returns A promise resolving to an array of all items found.
     */
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

    /**
     * Helper to fetch all folders from the API.
     * 
     * @param fields The fields to retrieve for each folder. Defaults to id, parent_id, and title.
     * @returns A promise resolving to an array of folder objects.
     */
    private async fetchAllFolders(fields: string[] = ['id', 'parent_id', 'title']) {
        return await this.fetchAllItems(['folders'], { fields: fields });
    }
    
    /**
     * Resolves the ID of the specific "Tasks" folder for a given project.
     * Uses the metadata cache for lookup, falling back to name-based discovery if necessary.
     */
    public async getTasksFolderForProject(projectId: string): Promise<string> {
        await this.loadProjectMeta();
        
        if (this.projectMeta[projectId]) {
            return this.projectMeta[projectId];
        }

        const allFolders = await this.fetchAllFolders();
        const projectFolders = allFolders.filter((f: any) => f.parent_id === projectId);
        const tasksFolder = projectFolders.find((f: any) => f.title.includes(Config.FOLDERS.TASKS));
        
        if (tasksFolder) {
            return tasksFolder.id;
        } else {
            return projectId; 
        }
    }
}