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
 * Builds the urgency option markup from the central tag configuration so the dialog
 * labels always match the tag names used everywhere else, marking the given keyword as
 * the selected option.
 * @param selected The urgency keyword to pre-select.
 * @returns The concatenated option elements.
 */
function buildUrgencyOptions(selected: string): string {
    const levels = [
        { value: Config.TAGS.KEYWORDS.HIGH, label: Config.TAGS.HIGH },
        { value: Config.TAGS.KEYWORDS.MEDIUM, label: Config.TAGS.MEDIUM },
        { value: Config.TAGS.KEYWORDS.LOW, label: Config.TAGS.LOW }
    ];
    return levels
        .map(l => `<option value="${l.value}"${l.value === selected ? ' selected' : ''}>${l.label}</option>`)
        .join('');
}

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
    if (result.id === "projects_create_new_project_dialog_confirm") {
        const formData = result.formData?.['projectForm']
        const projectName = formData?.['projectName']
        const projectIcon = formData?.['projectIcon']
        const projectTemplateContent = formData?.['projectTemplateContent']

        if(projectName.length === 0) {
            logger.error("No project name provided")
            await joplin.views.dialogs.showToast({message: "Project name required", duration: 3000, type: ToastType.Error})
        } else {
            logger.info(`Creating project: ${projectIcon} ${projectName}`);
            if(await createProject(projectName, projectIcon, projectTemplateContent)) {
                await joplin.views.dialogs.showToast({message: "Project created successfully", duration: 3000, type: ToastType.Success})
            } else {
                await joplin.views.dialogs.showToast({message: "Project creation failed", duration: 3000, type: ToastType.Error})
            }
        }
    } else {
        await joplin.views.dialogs.showToast({message: "Project creation canceled", duration: 3000, type: ToastType.Info})
    }
}

/**
 * Displays the dialog for creating a new task.
 * Dynamically loads project options and handles task creation or redirection to project creation.
 * @param defaultProjectId Optional ID of the project to pre-select.
 * @returns The form data object if confirmed, or null if canceled.
 */
export async function newTaskDialog(defaultProjectId?: string) {
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

    // The Add Project button is hidden by the dialog script.
    await joplin.views.dialogs.setButtons(dialog, [
        {id: "cancel", title: "Cancel"},
        {id: "add_project", title: "AddProjectInternal"},
        {id: "create", title: "Create Task"}
    ]);

    let html = readFileContent(path.join(pluginFolder, "gui", "assets", "html", "new_task_dialog_content.html")) || "Error loading form";

    const projects = await getAllProjects();
    let optionsHtml = projects.map((p: any) => {
        const selected = (defaultProjectId && p.id === defaultProjectId) ? 'selected' : '';
        return `<option value="${p.id}" ${selected}>${p.name}</option>`;
    }).join('');
    
    if (projects.length === 0) {
        optionsHtml = '<option value="">Create a project first...</option>';
        html = html.replace('id="taskProject" name="taskProject"', 'id="taskProject" name="taskProject" disabled');
    }
    
    html = html.replace('<!-- Options will be injected via JS or dynamically generated HTML -->', optionsHtml);
    html = html.replace('<!-- Urgency options are injected from Config.TAGS to stay consistent with the tag names -->', buildUrgencyOptions(Config.TAGS.KEYWORDS.MEDIUM));

    await joplin.views.dialogs.setHtml(dialog, html);

    const result = await joplin.views.dialogs.open(dialog);

    if (result.id === "add_project") {
        await newProjectDialog();
        // The task dialog is reopened after project creation, keeping the previous selection.
        return await newTaskDialog(defaultProjectId);
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
        {id: "text_edit", title: "Text Edit"},
        {id: "save", title: "Save Changes"}
    ]);

    let html = readFileContent(path.join(pluginFolder, "gui", "assets", "html", "new_task_dialog_content.html")) || "Error loading form";

    html = html.replace('<h1>New Task</h1>', '<h1>Edit Task</h1>');

    html = html.replace('id="taskTitle" name="taskTitle"', `id="taskTitle" name="taskTitle" value="${task.title.replace(/"/g, '&quot;')}"`);

    const projectOptions = `<option value="${task.projectId}" selected>${task.projectName}</option>`;
    html = html.replace('id="taskProject" name="taskProject"', `id="taskProject" name="taskProject" disabled`);
    html = html.replace('<!-- Options will be injected via JS or dynamically generated HTML -->', projectOptions);

    // The project-creation button is removed because the project is fixed in edit mode.
    html = html.replace('<button type="button" id="btnAddNewProject" class="btn-inline-add" title="Create new project">+</button>', '');

    if (task.dueDate && task.dueDate > 0) {
        const date = new Date(task.dueDate);
        // Formatted as YYYY-MM-DDTHH:mm in local time for the datetime-local input.
        const isoStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        html = html.replace('id="taskDueDate" name="taskDueDate"', `id="taskDueDate" name="taskDueDate" value="${isoStr}"`);
    }

    if (task.startDate && task.startDate > 0) {
        const date = new Date(task.startDate);
        // Formatted as YYYY-MM-DDTHH:mm in local time for the datetime-local input.
        const isoStr = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        html = html.replace('id="taskStartDate" name="taskStartDate"', `id="taskStartDate" name="taskStartDate" value="${isoStr}"`);
    }

    const urgency = task.tags.find((t: string) => t.toLowerCase().includes('high')) ? Config.TAGS.KEYWORDS.HIGH :
                    (task.tags.find((t: string) => t.toLowerCase().includes('low')) ? Config.TAGS.KEYWORDS.LOW : Config.TAGS.KEYWORDS.MEDIUM);

    html = html.replace('<!-- Urgency options are injected from Config.TAGS to stay consistent with the tag names -->', buildUrgencyOptions(urgency));

    // Subtasks are passed through a hidden input that the dialog script reads;
    // double quotes are escaped to keep the value attribute well-formed.
    const subTasksStr = task.subTasks.map((st: any) => `${'  '.repeat(st.level || 0)}- [${st.completed ? 'x' : ' '}] ${st.title}`).join('\n');
    html = html.replace('id="taskSubTasks" name="taskSubTasks" value=""', `id="taskSubTasks" name="taskSubTasks" value="${subTasksStr.replace(/"/g, '&quot;')}"`);

    await joplin.views.dialogs.setHtml(dialog, html);

    const result = await joplin.views.dialogs.open(dialog);
    
    if (result.id === "save") {
        return { action: 'save', data: result.formData?.['taskForm'] };
    }
    if (result.id === "delete") {
        return { action: 'delete' };
    }
    if (result.id === "text_edit") {
        return { action: 'text_edit' };
    }
    return null;
}