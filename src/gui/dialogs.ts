import joplin from "../../api";
import {createProject} from "../utils/projects";
import {ToastType} from "../../api/types";
import {Config} from "../utils/constants";
import Logger from "@joplin/utils/Logger";
import {readFileContent, getPluginFolder} from "../utils/utils";
import * as path from "node:path";

const logger = Logger.create('Projects: Index');

// Session's state variables
const HANDLES = {}

export async function newProjectDialog() {
    let dialog: string
    if(!Object.keys(HANDLES).includes(Config.DIALOGS.CREATE_PROJECT)) {
        const pluginFolder = await getPluginFolder()
        dialog = await joplin.views.dialogs.create(Config.DIALOGS.CREATE_PROJECT)
        HANDLES[Config.DIALOGS.CREATE_PROJECT] = dialog
        await joplin.views.dialogs.setButtons(dialog, [{id: "projects_create_new_project_dialog_cancel", title: "Cancel"}, {id: "projects_create_new_project_dialog_confirm", title: "Create"}]);
        await joplin.views.dialogs.setHtml(dialog, readFileContent(path.join(pluginFolder, "gui", "assets", "html", "new_project_dialog_content.html")) || "Unexpected error :(")
        await joplin.views.dialogs.addScript(dialog, path.join(".", "gui", "assets", "css", "new_project_dialog_content_style.css"))
        await joplin.views.dialogs.addScript(dialog, path.join(".", "gui", "assets", "js", "new_project_dialog_content_script.js"))
    } else {
        dialog = HANDLES[Config.DIALOGS.CREATE_PROJECT]
    }

    const result = await joplin.views.dialogs.open(dialog)
    console.log(result);
    if (result.id === "projects_create_new_project_dialog_confirm") {
        // Retrieving user submitted form data
        const formData = result.formData?.['projectForm']
        const projectName = formData?.['projectName']
        const projectIcon = formData?.['projectIcon']

        if(projectName.length === 0) {
            logger.error("No project name provided")
            await joplin.views.dialogs.showToast({message: "Project name required", duration: 3000, type: ToastType.Error})
        } else {
            logger.info(`Creating project: ${projectIcon} ${projectName}`);
            await createProject(projectName, projectIcon)
            await joplin.views.dialogs.showToast({message: "Project created successfully", duration: 3000, type: ToastType.Success})
        }
    } else {
        await joplin.views.dialogs.showToast({message: "Project creation canceled", duration: 3000, type: ToastType.Info})
    }
}