import Logger from "@joplin/utils/Logger";
import {Config} from "./constants";
import {
    readFileContent,
    getPluginFolder,
    writeFileContent, getPluginDataFolder
} from "./utils";
import * as path from "node:path";
import {createNote, createNotebook, getNotebookTitleById} from "./database";
import joplin from "../../api";
import { PersistenceService } from "../services/PersistenceService";

const logger = Logger.create('Projects: Projects');

type NoteObject = {name: string; content: Array<NoteObject>, is_todo: boolean};
type NotebookObject = {name:string, children:Array<NotebookObject|NoteObject>};

async function createProjectNotebooksAndNotes(projectStructure: NotebookObject, parent_id: string): Promise<string | null> {
    const currentNotebookId = (await createNotebook(projectStructure.name, parent_id)).id
    let tasksFolderId: string | null = null;

    if (projectStructure.name.includes(Config.FOLDERS.TASKS)) {
        tasksFolderId = currentNotebookId;
    }

    for (const element of projectStructure.children) {
        if ("content" in element) {
            await createNote(element.name, element.content.join("\n"), element.is_todo, currentNotebookId);
        } else {
            const childTaskId = await createProjectNotebooksAndNotes(element, currentNotebookId);
            if (childTaskId) tasksFolderId = childTaskId;
        }
    }
    return tasksFolderId;
}

async function createProjectsRoot() {
    return (await createNotebook("🗂️ Projects", "")).id
}

async function saveProjectMeta(projectId: string, tasksFolderId: string) {
    try {
        const dataFolder = await getPluginDataFolder();
        const metaPath = path.join(dataFolder, "project_meta.json");
        let meta = {};
        
        const existingContent = await readFileContent(metaPath);
        if (existingContent) {
            try {
                meta = JSON.parse(existingContent);
            } catch (e) {
                logger.error("Error parsing project_meta.json", e);
            }
        }

        meta[projectId] = tasksFolderId;
        await writeFileContent(metaPath, JSON.stringify(meta, null, 2));
    } catch (error) {
        logger.error("Error saving project meta", error);
    }
}

export async function createProject(projectName: string, projectIcon: string) {
    const defaultTemplateFile = path.join(await getPluginFolder(), "gui", "assets", "project_template.json")
    const projectTemplate = await readFileContent(defaultTemplateFile)
    if (!projectTemplate) {
        logger.error(`Unable to load the project template: ${defaultTemplateFile}`)
    } else {
        const projectStructure = JSON.parse(projectTemplate.replace("<PRJ_ICON> ", projectIcon.length > 0 ? projectIcon + " " : projectIcon).replace("<PRJ_NAME>", projectName))
        let projectParentNotebookId = await PersistenceService.getInstance().getValue('projects_root_id');
        
        if(!projectParentNotebookId || Object.keys(await getNotebookTitleById(projectParentNotebookId)).length === 0) {
            projectParentNotebookId= await createProjectsRoot()
            await PersistenceService.getInstance().setValue('projects_root_id', projectParentNotebookId)
        }
        
        // Create the top-level project folder first to get its ID
        const projectRootId = (await createNotebook(projectStructure.name, projectParentNotebookId)).id;
        
        // We need to iterate children of the structure now, passing the new root ID
        let tasksFolderId: string | null = null;
        
        for (const element of projectStructure.children) {
             if ("content" in element) {
                await createNote(element.name, element.content.join("\n"), element.is_todo, projectRootId);
             } else {
                const childId = await createProjectNotebooksAndNotes(element, projectRootId);
                if (childId) tasksFolderId = childId;
             }
        }

        if (tasksFolderId) {
            await saveProjectMeta(projectRootId, tasksFolderId);
        } else {
             await saveProjectMeta(projectRootId, projectRootId);
        }
    }
}

export async function getAllProjects() {
    const rootId = await PersistenceService.getInstance().getValue('projects_root_id');
    if (!rootId) return [];

    // Fetch all folders
    let page = 1;
    let folders = [];
    let response;
    do {
        response = await joplin.data.get(['folders'], { fields: ['id', 'parent_id', 'title'], page: page, limit: 100 });
        folders = folders.concat(response.items);
        page++;
    } while (response.has_more);

    // Filter direct children of root
    return folders.filter((f: any) => f.parent_id === rootId).map((p: any) => ({ id: p.id, name: p.title }));
}