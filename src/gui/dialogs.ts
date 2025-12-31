import joplin from "../../api";
import {createProject, getAllProjects} from "../utils/projects";
import {ToastType} from "../../api/types";
import {Config} from "../utils/constants";
import Logger from "@joplin/utils/Logger";
import {readFileContent, getPluginFolder} from "../utils/utils";
import * as path from "node:path";

const logger = Logger.create('Projects: Index');

// Session's state variables
const HANDLES = {}

/**
 * Displays the dialog for creating a new project.
 * Handles user input and invokes the project creation logic.
 */
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

/**
 * Displays the dialog for creating a new task.
 * Dynamically loads project options and handles task creation or redirection to project creation.
 * @returns The form data object if confirmed, or null if canceled.
 */
export async function newTaskDialog() {
    let dialog: string;
    const pluginFolder = await getPluginFolder();
    
    if (!HANDLES[Config.DIALOGS.CREATE_TASK]) {
        dialog = await joplin.views.dialogs.create(Config.DIALOGS.CREATE_TASK);
        HANDLES[Config.DIALOGS.CREATE_TASK] = dialog;
        await joplin.views.dialogs.addScript(dialog, path.join(".", "gui", "assets", "css", "new_task_dialog_content_style.css"));
        await joplin.views.dialogs.addScript(dialog, path.join(".", "gui", "assets", "js", "new_task_dialog_content_script.js"));
    } else {
        dialog = HANDLES[Config.DIALOGS.CREATE_TASK];
    }

    // Set buttons - include Add Project (will be hidden via script)
    await joplin.views.dialogs.setButtons(dialog, [
        {id: "cancel", title: "Cancel"}, 
        {id: "add_project", title: "AddProjectInternal"}, 
        {id: "create", title: "Create Task"}
    ]);

    // Load HTML template
    let html = readFileContent(path.join(pluginFolder, "gui", "assets", "html", "new_task_dialog_content.html")) || "Error loading form";
    
    // Inject projects
    const projects = await getAllProjects();
    let optionsHtml = projects.map((p: any) => `<option value="${p.id}">${p.name}</option>`).join('');
    
    if (projects.length === 0) {
        optionsHtml = '<option value="">Create a project first...</option>';
        html = html.replace('id="taskProject" name="taskProject"', 'id="taskProject" name="taskProject" disabled');
    }
    
    html = html.replace('<!-- Options will be injected via JS or dynamically generated HTML -->', optionsHtml);

    await joplin.views.dialogs.setHtml(dialog, html);

    const result = await joplin.views.dialogs.open(dialog);
    console.log('newTaskDialog: result received:', result);
    
    if (result.id === "add_project") {
        await newProjectDialog();
        // Re-open task dialog after project creation
        return await newTaskDialog();
    }

    if (result.id === "create") {
        return result.formData?.['taskForm'];
    }
    return null;
}

/**
 * Displays the dialog for editing an existing task.
 * Pre-fills the form with current task data (title, project, due date, urgency, subtasks).
 * @param task The task object to be edited.
 * @returns An object containing the action ('save' or 'delete') and updated data, or null if canceled.
 */
export async function editTaskDialog(task: any) {
    let dialog: string;
    const pluginFolder = await getPluginFolder();
    
    const editHandle = Config.DIALOGS.CREATE_TASK + "_edit";
    if (!HANDLES[editHandle]) {
        dialog = await joplin.views.dialogs.create(editHandle);
        HANDLES[editHandle] = dialog;
        await joplin.views.dialogs.addScript(dialog, path.join(".", "gui", "assets", "css", "new_task_dialog_content_style.css"));
        await joplin.views.dialogs.addScript(dialog, path.join(".", "gui", "assets", "js", "new_task_dialog_content_script.js"));
    } else {
        dialog = HANDLES[editHandle];
    }

    await joplin.views.dialogs.setButtons(dialog, [
        {id: "cancel", title: "Cancel"}, 
        {id: "delete", title: "Delete Task"},
        {id: "save", title: "Save Changes"}
    ]);

    // Load HTML template
    let html = readFileContent(path.join(pluginFolder, "gui", "assets", "html", "new_task_dialog_content.html")) || "Error loading form";
    
    // Customize for Edit
    html = html.replace('<h1>New Task</h1>', '<h1>Edit Task</h1>');
    
    // Disable Title and Project
    html = html.replace('id="taskTitle" name="taskTitle"', `id="taskTitle" name="taskTitle" value="${task.title}" disabled`);
    
    // For Project, we just show the one project as disabled
    const projectOptions = `<option value="${task.projectId}" selected>${task.projectName}</option>`;
    html = html.replace('id="taskProject" name="taskProject"', `id="taskProject" name="taskProject" disabled`);
    html = html.replace('<!-- Options will be injected via JS or dynamically generated HTML -->', projectOptions);
    
    // Remove the "+" button for project creation in edit mode
    html = html.replace('<button type="button" id="btnAddNewProject" class="btn-inline-add" title="Create new project">+</button>', '');

    // Pre-fill Due Date
    if (task.dueDate > 0) {
        const date = new Date(task.dueDate);
        // Format to YYYY-MM-DDTHH:mm for datetime-local
        const isoStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        html = html.replace('id="taskDueDate" name="taskDueDate"', `id="taskDueDate" name="taskDueDate" value="${isoStr}"`);
    }

    // Pre-fill Urgency
    const urgency = task.tags.find((t: string) => t.toLowerCase().includes('high')) ? 'high' : 
                    (task.tags.find((t: string) => t.toLowerCase().includes('low')) ? 'low' : 'normal');
    
    if (urgency === 'high') {
        html = html.replace('value="high"', 'value="high" selected');
        html = html.replace('value="normal" selected', 'value="normal"');
    } else if (urgency === 'low') {
        html = html.replace('value="low"', 'value="low" selected');
        html = html.replace('value="normal" selected', 'value="normal"');
    }

    // Subtasks are handled by the script which reads the hidden input value
    const subTasksStr = task.subTasks.map((st: any) => st.title).join('\n');
    // Using a safer way to inject value into the hidden field
    html = html.replace('id="taskSubTasks" name="taskSubTasks" value=""', `id="taskSubTasks" name="taskSubTasks" value="${subTasksStr.replace(/"/g, '&quot;')}"`);

    await joplin.views.dialogs.setHtml(dialog, html);

    const result = await joplin.views.dialogs.open(dialog);
    
    if (result.id === "save") {
        return { action: 'save', data: result.formData?.['taskForm'] };
    }
    if (result.id === "delete") {
        return { action: 'delete' };
    }
    return null;
}