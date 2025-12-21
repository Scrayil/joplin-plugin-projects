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
    const projectParentNotebookId = (await createNotebook("🗂️ Projects", "")).id
    const kanban = await createNote( "WIP", readFileContent(path.join(await getPluginFolder(), "gui", "assets", "main_kanban.md")), false, projectParentNotebookId)
    await createNote( "Pending tasks", readFileContent(path.join(await getPluginFolder(), "gui", "assets", "main_overview.md")), false, projectParentNotebookId)
    return [projectParentNotebookId, kanban.id]
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
        const projectStructure = JSON.parse(projectTemplate.replace("<PRJ_ICON>", projectIcon).replace("<PRJ_NAME>", projectName))
        let projectParentNotebookId = await getSettingValue(Config.SETTINGS.PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE)
        if(!projectParentNotebookId || Object.keys(await getNotebookTitleById(projectParentNotebookId)).length === 0) {
            let kanbanId: any
            [projectParentNotebookId, kanbanId] = await createProjectsRoot()
            await setSettingValue(Config.SETTINGS.PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE, projectParentNotebookId)
            // Opens and focuses the kanban note on creation
            await joplin.commands.execute('openNote', kanbanId);
        }
        await createProjectNotebooksAndNotes(projectStructure, projectParentNotebookId);
    }
}