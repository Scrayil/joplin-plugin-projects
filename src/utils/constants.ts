import joplin from "../../api";

const PREFIX = "projects_"

export const Config = {
    COMMANDS: {
        NEW_PROJECT: PREFIX + 'create_new_project',
        TOGGLE_DASHBOARD: PREFIX + 'toggle_dashboard',
    },

    MENUS: {
        TOGGLE_DASHBOARD_ACCELERATOR: "Ctrl+Alt+P",
        TOGGLE_DASHBOARD_BUTTON: PREFIX + 'toggle_dashboard_button',
        TOGGLE_DASHBOARD_TOOLBAR_CONTEXT: PREFIX + 'toggle_dashboard_toolbar_menu',
        NEW_PROJECT_ACCELERATOR: 'Ctrl+N',
        NEW_PROJECT_TOOLBAR_CONTEXT: PREFIX + 'create_new_project_toolbar_menu',
        NEW_PROJECT_FOLDER_CONTEXT: PREFIX + 'create_new_project_folders_menu',
        NEW_PROJECT_NOTES_CONTEXT: PREFIX + 'create_new_project_notes_menu',
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
    },

    ANCHOR: {
        TITLE: '⚙️ Projects Root Marker',
        BODY: 'DO NOT DELETE.\n\nThis note is used by the Projects plugin to identify the root folder across different devices.\nDeleting this note may cause the plugin to create duplicate project folders on other devices.',
    }
} as const;
