import Logger from "@joplin/utils/Logger";
import {Config} from "./constants";
import {
    readFileContent,
    getPluginFolder,
    writeFileContent, getPluginDataFolder
} from "./utils";
import * as path from "node:path";
import {createNote, createNotebook} from "./database"; // Removed getNotebookTitleById import as we do direct checks now
import joplin from "../../api";
import { PersistenceService } from "../services/PersistenceService";

const logger = Logger.create('Projects: Projects');

type NoteObject = {name: string; content: Array<NoteObject>, is_todo: boolean};
type NotebookObject = {name:string, children:Array<NotebookObject|NoteObject>};

// Cache to prevent repetitive API scanning for the anchor note during polling
let anchorValidatedForId: string | null = null;

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

/**
 * Checks for the existence of the anchor note in the given folder.
 * If not found, creates it to ensure future synchronization.
 */
async function ensureAnchorNote(folderId: string) {
    if (anchorValidatedForId === folderId) {
        return;
    }

    try {
        let page = 1;
        let found = false;
        let response;
        
        do {
            response = await joplin.data.get(['folders', folderId, 'notes'], { 
                fields: ['id', 'title'], 
                page: page, 
                limit: 50 
            });
            
            if (response.items.find((n: any) => n.title === Config.ANCHOR.TITLE)) {
                found = true;
                break;
            }
            page++;
        } while (response.has_more);

        if (!found) {
            logger.info("Anchor note not found in root folder. Creating migration anchor.");
            await createNote(Config.ANCHOR.TITLE, Config.ANCHOR.BODY, false, folderId);
        }
        
        // Cache the validation success
        anchorValidatedForId = folderId;
    } catch (error) {
        logger.error("Error ensuring anchor note:", error);
    }
}

/**
 * Searches the entire Joplin database for the unique Anchor Note.
 * Used to recover the Root Folder ID on new devices.
 */
async function findProjectRootViaAnchor(): Promise<string | null> {
    try {
        // Search by exact title. 
        const response = await joplin.data.get(['search'], { 
            query: `title:"${Config.ANCHOR.TITLE}"`, 
            type: 'note',
            fields: ['id', 'parent_id', 'title']
        });

        if (response.items.length > 0) {
            // We might find multiple (trash vs active), so we check them
            for (const anchor of response.items) {
                try {
                    // Check if the parent folder is valid and NOT in trash
                    const parent = await joplin.data.get(['folders', anchor.parent_id], { fields: ['id', 'deleted_time'] });
                    
                    if (parent && !parent.deleted_time) {
                        logger.info(`Found existing Active Project Root via Anchor: ${anchor.parent_id}`);
                        return anchor.parent_id;
                    }
                } catch (e) {
                    // Parent might be missing entirely
                    continue;
                }
            }
        }
    } catch (error) {
        logger.error("Error searching for anchor note:", error);
    }
    return null;
}

/**
 * The core logic to resolve the "Projects" root folder.
 * 1. Checks local persistence AND if folder is not in trash.
 * 2. If missing/trashed, checks for global Anchor Note (Sync recovery).
 * 3. If missing, creates new Root + Anchor (Clean slate) ONLY if autoCreate is true.
 */
export async function getOrInitProjectRootId(autoCreate: boolean = true): Promise<string | null> {
    const persistence = PersistenceService.getInstance();
    let rootId = await persistence.getValue('projects_root_id');
    
    // VALIDATION: Check if locally stored ID is still valid AND NOT IN TRASH
    let isValid = false;
    if (rootId) {
        try {
            const folder = await joplin.data.get(['folders', rootId], { fields: ['id', 'deleted_time'] });
            if (folder && !folder.deleted_time) {
                isValid = true;
            } else {
                logger.warn(`Stored root ID ${rootId} is invalid or in trash. Resetting.`);
            }
        } catch (e) {
            logger.warn(`Stored root ID ${rootId} could not be fetched. Resetting.`);
        }
    }

    if (!isValid) {
        rootId = null;
    }

    // SCENARIO 1: Local ID is valid and active.
    if (isValid) {
        await ensureAnchorNote(rootId);
        return rootId;
    }

    // SCENARIO 2: No valid local ID. Search for Anchor Note.
    const discoveredId = await findProjectRootViaAnchor();
    if (discoveredId) {
        await persistence.setValue('projects_root_id', discoveredId);
        return discoveredId;
    }

    // SCENARIO 3: Nothing found. 
    if (!autoCreate) {
        return null;
    }

    // Fresh Start.
    logger.info("No Active Project Root found. Creating new structure.");
    const newRoot = await createNotebook("🗂️ Projects", "");
    const newId = newRoot.id;
    
    await createNote(Config.ANCHOR.TITLE, Config.ANCHOR.BODY, false, newId);
    await persistence.setValue('projects_root_id', newId);
    
    return newId;
}

/**
 * Persists the project metadata (mapping project root ID to tasks folder ID).
 */
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

/**
 * Creates a new project structure from a template.
 * @param projectName The name of the project.
 * @param projectIcon The icon/emoji for the project.
 */
export async function createProject(projectName: string, projectIcon: string) {
    const defaultTemplateFile = path.join(await getPluginFolder(), "gui", "assets", "project_template.json")
    const projectTemplate = await readFileContent(defaultTemplateFile)
    if (!projectTemplate) {
        logger.error(`Unable to load the project template: ${defaultTemplateFile}`)
    } else {
        const projectStructure = JSON.parse(projectTemplate.replace("<PRJ_ICON> ", projectIcon.length > 0 ? projectIcon + " " : projectIcon).replace("<PRJ_NAME>", projectName))
        
        // Use the new robust resolver
        const projectParentNotebookId = await getOrInitProjectRootId();
        
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

/**
 * Retrieves all project folders that are direct children of the "Projects" root.
 * @returns Array of project objects {id, name}.
 */
export async function getAllProjects() {
    // Use the new robust resolver 
    const rootId = await getOrInitProjectRootId(false);
    
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