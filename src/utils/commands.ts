import joplin from "../../api";
import {MenuItemLocation, ToolbarButtonLocation} from "../../api/types";
import {newProjectDialog} from "../gui/dialogs";
import {Config} from "./constants";
import {TaskDashboard} from "../gui/TaskDashboard";

/**
 * Registers all plugin commands, toolbar buttons, and context menu items.
 */
export const registerJoplinCommands = async () => {
    await joplin.commands.register({
        name: Config.COMMANDS.NEW_PROJECT,
        label: 'Create a new project',
        iconName: 'fas fa-folder-plus',
        execute: async () => {
            await newProjectDialog()
        },
    });

    await joplin.commands.register({
        name: Config.COMMANDS.TOGGLE_DASHBOARD,
        label: 'Toggle Project Dashboard',
        iconName: 'fas fa-folder-open',
        execute: async () => {
            await TaskDashboard.getInstance().toggle();
        },
    });

    await joplin.views.toolbarButtons.create(Config.MENUS.TOGGLE_DASHBOARD_BUTTON, Config.COMMANDS.TOGGLE_DASHBOARD, ToolbarButtonLocation.NoteToolbar);
    await joplin.views.menuItems.create(Config.MENUS.TOGGLE_DASHBOARD_TOOLBAR_CONTEXT, Config.COMMANDS.TOGGLE_DASHBOARD, MenuItemLocation.View, {accelerator: Config.MENUS.TOGGLE_DASHBOARD_ACCELERATOR});
    await joplin.views.menuItems.create(Config.MENUS.NEW_PROJECT_TOOLBAR_CONTEXT, Config.COMMANDS.NEW_PROJECT, MenuItemLocation.Tools, {accelerator: Config.MENUS.NEW_PROJECT_ACCELERATOR})
    await joplin.views.menuItems.create(Config.MENUS.NEW_PROJECT_FOLDER_CONTEXT, Config.COMMANDS.NEW_PROJECT, MenuItemLocation.FolderContextMenu, {accelerator: Config.MENUS.NEW_PROJECT_ACCELERATOR})
    await joplin.views.menuItems.create(Config.MENUS.NEW_PROJECT_NOTES_CONTEXT, Config.COMMANDS.NEW_PROJECT, MenuItemLocation.NoteListContextMenu, {accelerator: Config.MENUS.NEW_PROJECT_ACCELERATOR})
}