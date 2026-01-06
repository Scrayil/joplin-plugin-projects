import { Config } from '../utils/constants';
import { getPluginDataFolder, readFileContent, writeFileContent, getPluginFolder } from '../utils/utils';
import { TagService } from './TagService';
import { NoteParser } from './NoteParser';
import * as path from 'path';
import * as fs from 'fs';
import { getOrInitProjectRootId } from '../utils/projects';
import { fetchAllItems, getNote, createNotebook, getFolder } from '../utils/database';

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

        // Use the smart resolver. Pass 'false' to avoid auto-creating the folder structure
        // just by opening the dashboard. It will only return an ID if it exists locally or via Anchor note.
        const rootId = await getOrInitProjectRootId(false);
        
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
            const notes = await fetchAllItems(['folders', folderId, 'notes'], {
                fields: ['id', 'updated_time', 'is_todo', 'parent_id', 'title', 'todo_completed', 'todo_due', 'created_time']
            });
            const todos = notes.filter((n: any) => n.is_todo);
            validTodosMetadata = validTodosMetadata.concat(todos);
            
            todos.forEach((n: any) => {
                if (n.updated_time > maxUpdated) maxUpdated = n.updated_time;
            });
        }

        // Fetch tags for ALL candidate notes to include in the signature.
        // This ensures that if a tag is added/removed externally, the signature changes.
        const noteIds = validTodosMetadata.map(n => n.id);
        const tagsMap = await this.tagService.getTagsForNotes(noteIds);

        // Create a signature based on Note Updates AND Tag content
        let tagsSignature = '';
        tagsMap.forEach((tags, id) => {
            tagsSignature += `${id}:${tags.sort().join(',')}|`;
        });

        const currentSignature = `${validTodosMetadata.length}-${maxUpdated}-${tagsSignature}`;
        
        if (this.dashboardCache && currentSignature === this.lastSignature) {
            return this.dashboardCache;
        }

        // Cache miss or data changed: We already have metadata and tags, just need bodies for parsing subtasks
        // Optimization: Batch the body fetching to prevent freezing the UI with too many concurrent requests.
        const notesWithBody: any[] = [];
        const batchSize = 20;
        
        for (let i = 0; i < validTodosMetadata.length; i += batchSize) {
            const batch = validTodosMetadata.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (n) => {
                 const noteWithBody = await getNote(n.id, ['body']);
                 return { ...n, body: noteWithBody.body };
            }));
            notesWithBody.push(...batchResults);
        }

        const dashboardTasks: any[] = [];
        for (const n of notesWithBody) {
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
                completedTime: n.todo_completed,
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
     * Forcefully invalidates the dashboard cache.
     * Useful when changes (like tag updates) might not be reflected in the note's updated_time.
     */
    public invalidateCache() {
        this.lastSignature = '';
    }

    /**
     * Helper to fetch all folders from the API.
     * 
     * @param fields The fields to retrieve for each folder. Defaults to id, parent_id, and title.
     * @returns A promise resolving to an array of folder objects.
     */
    private async fetchAllFolders(fields: string[] = ['id', 'parent_id', 'title']) {
        return await fetchAllItems(['folders'], { fields: fields });
    }
    
    /**
     * Persists the project metadata to the plugin data folder.
     */
    private async saveProjectMeta(projectId: string, tasksFolderId: string) {
        try {
            const dataFolder = await getPluginDataFolder();
            const metaPath = path.join(dataFolder, "project_meta.json");
            
            // Update local state first
            this.projectMeta[projectId] = tasksFolderId;
            
            // Persist to file
            await writeFileContent(metaPath, JSON.stringify(this.projectMeta, null, 2));
        } catch (error) {
            console.error("ProjectService: Error saving project meta", error);
        }
    }

    /**
     * Reads the base project template to determine the default name for the Tasks folder.
     * This ensures that recreated folders match the style (emojis) of the original template.
     */
    private async getDefaultTasksFolderName(): Promise<string> {
        try {
            const pluginFolder = await getPluginFolder();
            const templatePath = path.join(pluginFolder, "gui", "assets", "base_project_template.json");
            const content = await readFileContent(templatePath);
            if (content) {
                const template = JSON.parse(content);
                const taskNode = template.children?.find((c: any) => c.name.includes(Config.FOLDERS.TASKS));
                if (taskNode) return taskNode.name;
            }
        } catch (e) {
            console.error("ProjectService: Error reading base template", e);
        }
        return "🗓️ " + Config.FOLDERS.TASKS; 
    }

    /**
     * Resolves the ID of the specific "Tasks" folder for a given project.
     * Uses the metadata cache for lookup, checks for existence, and recreates the folder if it was deleted.
     */
    public async getTasksFolderForProject(projectId: string): Promise<string> {
        await this.loadProjectMeta();
        
        let tasksFolderId = this.projectMeta[projectId];

        // Verifying if the cached folder ID still exists and is not in trash
        if (tasksFolderId) {
            try {
                const folder = await getFolder(tasksFolderId, ['id', 'deleted_time']);
                if (folder && !folder.deleted_time) {
                    return tasksFolderId;
                }
                // The folder is invalid/deleted. It must be recreated.
                console.warn(`ProjectService: Tasks folder ${tasksFolderId} for project ${projectId} is missing/deleted. Recovering...`);
            } catch (e) {
                console.warn(`ProjectService: cached tasks folder ${tasksFolderId} not found.`);
            }
        }

        // Scanning children to see if a "Tasks" folder exists (but was not linked)
        const allFolders = await this.fetchAllFolders();
        const projectFolders = allFolders.filter((f: any) => f.parent_id === projectId);
        const existingTasksFolder = projectFolders.find((f: any) => f.title.includes(Config.FOLDERS.TASKS));
        
        if (existingTasksFolder) {
            // Found existing folder, relinking it
            await this.saveProjectMeta(projectId, existingTasksFolder.id);
            return existingTasksFolder.id;
        }

        // Last Resort: Creating a new "Tasks" folder
        console.info(`ProjectService: Creating new Tasks folder for project ${projectId}`);
        const folderName = await this.getDefaultTasksFolderName();
        const newTasksFolder = await createNotebook(folderName, projectId);
        await this.saveProjectMeta(projectId, newTasksFolder.id);
        
        return newTasksFolder.id;
    }
}