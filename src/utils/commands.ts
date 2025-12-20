import joplin from "../../api";
import {MenuItemLocation} from "../../api/types";
import {newProjectDialog} from "../gui/dialogs";
import {Config} from "./constants";

export const registerJoplinCommands = async () => {
    // Registers a command that creates the TOT note.
    // This is triggered by the below button's click
    await joplin.commands.register({
        name: Config.COMMANDS.NEW_PROJECT,
        label: 'Create a new project',
        iconName: 'fas fa-folder-plus',
        execute: async () => {
            await newProjectDialog()
        },
    });

    // Adds also a context menu entry for the note editor, to generate the corresponding TOT
    await joplin.views.menuItems.create(Config.MENUS.TOOLBAR_CONTEXT, Config.COMMANDS.NEW_PROJECT, MenuItemLocation.Tools, {accelerator: Config.MENUS.ACCELERATOR})
    // Adds a menu entry to the folders' context menu
    await joplin.views.menuItems.create(Config.MENUS.FOLDER_CONTEXT, Config.COMMANDS.NEW_PROJECT, MenuItemLocation.FolderContextMenu, {accelerator: Config.MENUS.ACCELERATOR})
    // Adds a menu entry to the note list's context menu
    await joplin.views.menuItems.create(Config.MENUS.NOTES_CONTEXT, Config.COMMANDS.NEW_PROJECT, MenuItemLocation.NoteListContextMenu, {accelerator: Config.MENUS.ACCELERATOR})
}