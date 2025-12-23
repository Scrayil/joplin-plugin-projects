import Logger from "@joplin/utils/Logger";
import {Config} from "./constants";
import {
    readFileContent,
    getPluginFolder,
    getSettingValue, writeFileContent, getPluginDataFolder, setSettingValue,
} from "./utils";
import * as path from "node:path";
import {createNote, createNotebook, getNotebookTitleById} from "./database";
import joplin from "../../api";

const logger = Logger.create('Projects: Projects');

type NoteObject = {name: string; content: Array<NoteObject>, is_todo: boolean};
type NotebookObject = {name:string, children:Array<NotebookObject|NoteObject>};

async function createProjectNotebooksAndNotes(projectStructure: NotebookObject, parent_id: string) {
    const currentNotebookId = (await createNotebook(projectStructure.name, parent_id)).id
    for (const element of projectStructure.children) {
        if ("content" in element) {
            await createNote(element.name, element.content.join("\n"), element.is_todo, currentNotebookId);
        } else {
            await createProjectNotebooksAndNotes(element, currentNotebookId);
        }
    }
}

async function createProjectsRoot() {
    return (await createNotebook("🗂️ Projects", "")).id
}

export async function createProject(projectName: string, projectIcon: string) {
    const defaultTemplateFile = path.join(await getPluginFolder(), "gui", "assets", "project_template.json")
    let projectTemplateFile = await getSettingValue(Config.SETTINGS.PROJECT_TEMPLATE_PATH);
    if (!projectTemplateFile) {
        projectTemplateFile = defaultTemplateFile
    }
    const projectTemplate = readFileContent(projectTemplateFile)
    if (!projectTemplate) {
        logger.error(`Unable to load the project template: ${projectTemplateFile}`)
    } else {
        const projectStructure = JSON.parse(projectTemplate.replace("<PRJ_ICON> ", projectIcon.length > 0 ? projectIcon + " " : projectIcon).replace("<PRJ_NAME>", projectName))
        let projectParentNotebookId = await getSettingValue(Config.SETTINGS.PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE)
        if(!projectParentNotebookId || Object.keys(await getNotebookTitleById(projectParentNotebookId)).length === 0) {
            projectParentNotebookId= await createProjectsRoot()
            await setSettingValue(Config.SETTINGS.PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE, projectParentNotebookId)
        }
        await createProjectNotebooksAndNotes(projectStructure, projectParentNotebookId);
    }
}

export async function getAllProjects() {
    const rootId = await getSettingValue(Config.SETTINGS.PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE);
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