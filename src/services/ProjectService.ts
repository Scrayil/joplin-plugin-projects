import joplin from 'api';
import { Config } from '../utils/constants';
import { getSettingValue, getPluginDataFolder, readFileContent } from '../utils/utils';
import { TagService } from './TagService';
import { NoteParser } from './NoteParser';
import * as path from 'path';
import * as fs from 'fs';

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

                public async getDashboardData() {

                    await this.loadProjectMeta();

            

                    const rootId = await getSettingValue(Config.SETTINGS.PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE);

                    

                    if (!rootId) {

                        return { projects: [], tasks: [] };

                    }

            

                    // 1. Fetch all folders to build the project map

                    const allFolders = await this.fetchAllFolders(['id', 'parent_id', 'title']);

                    

                    // Identify Project Roots

                    const projectFolders = allFolders.filter((f: any) => f.parent_id === rootId);

                    

                    // Build map

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

            

                    // 2. Lightweight Check: Direct Folder Scan (Real-time)

                    // We iterate the specific project folders to get metadata. This is faster than full body fetch

                    // and more consistent than Search API (which lags).

                    

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

            

                    // --- Data Changed: Heavy Fetch ---

                    // We need full data (bodies). We can re-use the logic of iterating folders, 

                    // asking for more fields.

                    

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
                tasks: dashboardTasks
            };
            
            this.dashboardCache = data;
            this.lastSignature = currentSignature;
            
            return data;
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

    private async fetchAllFolders(fields: string[] = ['id', 'parent_id', 'title']) {
        return await this.fetchAllItems(['folders'], { fields: fields });
    }
    
    public async getTasksFolderForProject(projectId: string): Promise<string> {
        // Reload meta to ensure we have latest
        await this.loadProjectMeta();
        
        if (this.projectMeta[projectId]) {
            return this.projectMeta[projectId];
        }

        // Fallback
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
