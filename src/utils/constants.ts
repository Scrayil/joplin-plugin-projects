import joplin from "../../api";

const PREFIX = "projects_"

export const Config = {
    SETTINGS: {
        PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE: PREFIX + "parent_id.txt",
        PROJECT_TEMPLATE_PATH: PREFIX + "new_project_template",
    },

    COMMANDS: {
        NEW_PROJECT: PREFIX + 'create_new_project',
        TOGGLE_DASHBOARD: PREFIX + 'toggle_dashboard',
    },

    MENUS: {
        ACCELERATOR: 'Ctrl+N',
        TOOLBAR_CONTEXT: PREFIX + 'create_new_project_toolbar_menu',
        FOLDER_CONTEXT: PREFIX + 'create_new_project_folders_menu',
        NOTES_CONTEXT: PREFIX + 'create_new_project_notes_menu',
        DASHBOARD_BUTTON: PREFIX + 'dashboard_button',
    },

    DIALOGS: {
        CREATE_PROJECT: PREFIX + "create_new_project_dialog",
        CREATE_TASK: PREFIX + "create_new_task_dialog",
    },

    TAGS: {
        HIGH: '🔴 High',
        MEDIUM: '🟠 Medium',
        LOW: '🔵 Low',
        IN_PROGRESS: 'In Progress',
        KEYWORDS: {
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low',
            NORMAL: 'normal',
            IN_PROGRESS: 'in progress',
            DOING: 'doing'
        }
    },

    FOLDERS: {
        TASKS: 'Tasks'
    }
} as const;
