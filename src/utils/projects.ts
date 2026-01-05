import Logger from "@joplin/utils/Logger";
import { Config } from "./constants";
import {
    readFileContent,
    getPluginFolder,
    writeFileContent,
    getPluginDataFolder, 
    getSettingValue, 
    isValidWikiStructure
} from "./utils";
import * as path from "node:path";
import { 
    createNote, 
    createNotebook, 
    getFolder, 
    searchNotes, 
    fetchAllItems 
} from "./database";
import { PersistenceService } from "../services/PersistenceService";
import joplin from "../../api";
import { ToastType } from "../../api/types";
import { WikiNode } from "./types";

const logger = Logger.create('Projects: Projects');

// Cache to prevent repetitive API scanning for the anchor note during polling
let anchorValidatedForId: string | null = null;

async function createProjectNotebooksAndNotes(projectStructure: WikiNode, parent_id: string): Promise<string | null> {
    const currentNotebookId = (await createNotebook(projectStructure.name, parent_id)).id;
    let tasksFolderId: string | null = null;

    if (projectStructure.name.includes(Config.FOLDERS.TASKS)) {
        tasksFolderId = currentNotebookId;
    }

    if (projectStructure.children) {
        for (const element of projectStructure.children) {
            if ("content" in element) {
                await createNote(element.name, element.content.join("\n"), element.is_todo, currentNotebookId);
            } else {
                const childTaskId = await createProjectNotebooksAndNotes(element, currentNotebookId);
                if (childTaskId) tasksFolderId = childTaskId;
            }
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
        const notes = await fetchAllItems(['folders', folderId, 'notes'], { fields: ['id', 'title'] });
        const found = notes.find((n: any) => n.title === Config.ANCHOR.TITLE);

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
        const response = await searchNotes(`title:"${Config.ANCHOR.TITLE}"`, ['id', 'parent_id', 'title']);

        if (response.items.length > 0) {
            // We might find multiple (trash vs active), so we check them
            for (const anchor of response.items) {
                try {
                    // Check if the parent folder is valid and NOT in trash
                    const parent = await getFolder(anchor.parent_id, ['id', 'deleted_time']);
                    
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
            const folder = await getFolder(rootId, ['id', 'deleted_time']);
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
        let meta: { [key: string]: string } = {};
        
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
 * Retrieves the user-defined wiki template content.
 * Falls back to the provided custom content (one-off), then the setting, then the default asset file.
 */
async function getWikiTemplateContent(customContent?: string): Promise<string | null> {
    // 1. Priority: One-off custom content from dialog
    if (customContent && customContent.trim().length > 0) {
        return customContent;
    }

    // 2. Priority: Global Setting
    let templatePath = await getSettingValue(Config.SETTINGS.PROJECT_WIKI_TEMPLATE);

    // 3. Priority: Default Asset
    if (!templatePath || templatePath.length === 0) {
        templatePath = path.join(await getPluginFolder(), "gui", "assets", "new_project_wiki_structure.json");
    }

    const content = await readFileContent(templatePath);
    if (!content || content.length === 0) {
        logger.error(`Invalid template path or empty file: ${templatePath}`);
        await joplin.views.dialogs.showToast({
            message: "Invalid user defined template path",
            duration: 3000,
            type: ToastType.Error
        });
        return null;
    }
    return content;
}

/**
 * Parses and validates the wiki template JSON structure.
 */
async function parseAndValidateTemplate(jsonContent: string): Promise<any | null> {
    try {
        const template = JSON.parse(jsonContent);
        if (!isValidWikiStructure(template)) {
            await joplin.views.dialogs.showToast({
                message: "Invalid user defined template json format.\nCheck the console for details.",
                duration: 3000,
                type: ToastType.Error
            });
            return null;
        }
        return template;
    } catch (e) {
        logger.error("Invalid user defined template json format!", e);
        await joplin.views.dialogs.showToast({
            message: "Invalid user defined template json format",
            duration: 3000,
            type: ToastType.Error
        });
        return null;
    }
}

/**
 * Creates a new project structure from a template.
 * @param projectName The name of the project.
 * @param projectIcon The icon/emoji for the project.
 * @param customTemplateContent Optional JSON string content of a specific wiki template to use.
 * @returns a boolean flag stating if the operation is successful
 */
export async function createProject(projectName: string, projectIcon: string, customTemplateContent?: string): Promise<boolean> {
    const defaultTemplateFile = path.join(await getPluginFolder(), "gui", "assets", "base_project_template.json");
    const projectTemplateString = await readFileContent(defaultTemplateFile);
    
    if (!projectTemplateString) {
        logger.error(`Unable to load the base project template: ${defaultTemplateFile}`);
        return false;
    }

    // 1. Prepare Base Structure
    const projectStructure = JSON.parse(
        projectTemplateString
            .replace("<PRJ_ICON> ", projectIcon.length > 0 ? projectIcon + " " : projectIcon)
            .replace("<PRJ_NAME>", projectName)
    );

    // 2. Fetch and Validate Wiki Template
    const wikiTemplateContent = await getWikiTemplateContent(customTemplateContent);
    if (!wikiTemplateContent) return false;

    const wikiTemplate = await parseAndValidateTemplate(wikiTemplateContent);
    if (!wikiTemplate) return false;
    // Merging templates
    if (!projectStructure.children) projectStructure.children = [];
    projectStructure.children.push(wikiTemplate);

    // Creating structure in Joplin
    const projectParentNotebookId = await getOrInitProjectRootId();
    
    // Creating root project folder
    const projectRootId = (await createNotebook(projectStructure.name, projectParentNotebookId)).id;
    
    // Creating children recursively
    let tasksFolderId: string | null = null;
    for (const element of projectStructure.children) {
        if ("content" in element) {
            await createNote(element.name, element.content.join("\n"), element.is_todo, projectRootId);
        } else {
            const childId = await createProjectNotebooksAndNotes(element, projectRootId);
            if (childId) tasksFolderId = childId;
        }
    }

    // Saving metadata
    if (tasksFolderId) {
        await saveProjectMeta(projectRootId, tasksFolderId);
    } else {
        await saveProjectMeta(projectRootId, projectRootId);
    }

    return true;
}

/**
 * Retrieves all project folders that are direct children of the "Projects" root.
 * @returns Array of project objects {id, name}.
 */
export async function getAllProjects() {
    // Use the new robust resolver 
    const rootId = await getOrInitProjectRootId(false);
    
    if (!rootId) return [];

    // Fetch all folders using helper
    const folders = await fetchAllItems(['folders'], { fields: ['id', 'parent_id', 'title'] });

    // Filter direct children of root
    return folders.filter((f: any) => f.parent_id === rootId).map((p: any) => ({ id: p.id, name: p.title }));
}