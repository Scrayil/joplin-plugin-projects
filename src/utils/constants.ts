import joplin from "../../api";

const PREFIX = "projects_"

export const Config = {
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
    },

    ANCHOR: {
        TITLE: '⚙️ Projects Root Marker',
        BODY: 'DO NOT DELETE.\n\nThis note is used by the Projects plugin to identify the root folder across different devices.\nDeleting this note may cause the plugin to create duplicate project folders on other devices.',
    }
} as const;
