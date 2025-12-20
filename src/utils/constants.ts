import joplin from "../../api";

const PREFIX = "projects_"

export const Config = {
    SETTINGS: {
        PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE: PREFIX + "parent_id.txt",
        PROJECT_TEMPLATE_PATH: PREFIX + "new_project_template",
    },

    COMMANDS: {
        NEW_PROJECT: PREFIX + 'create_new_project',
    },

    MENUS: {
        ACCELERATOR: 'Ctrl+N',
        TOOLBAR_CONTEXT: PREFIX + 'create_new_project_toolbar_menu',
        FOLDER_CONTEXT: PREFIX + 'create_new_project_folders_menu',
        NOTES_CONTEXT: PREFIX + 'create_new_project_notes_menu',
    },

    DIALOGS: {
        CREATE_PROJECT: PREFIX + "create_new_project_dialog",
    },
} as const;