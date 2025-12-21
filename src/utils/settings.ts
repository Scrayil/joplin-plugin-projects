import joplin from "../../api";
import {SettingItemSubType, SettingItemType} from "../../api/types";
import {Config} from "./constants";


export const registerSettings = async () => {
    const settingsSection = "projects_settings"

    // Creating a new settings' section for the plugin
    await joplin.settings.registerSection(settingsSection, {
        label: 'Projects',
        iconName: 'fas fa-folder',
    });

    // public: false => STATE MANAGEMENT PRIVATE SETTINGS
    await joplin.settings.registerSettings({
        [Config.SETTINGS.PROJECTS_PRIVATE_PARENT_NOTEBOOK_FILE]: {
            value: "",
            type: SettingItemType.String,
            public: false,
            label: "Projects root notebook's parent id"
        },
        [Config.SETTINGS.PROJECT_TEMPLATE_PATH]: {
            value: "",
            type: SettingItemType.String,
            subType: SettingItemSubType.FilePath,
            section: settingsSection,
            public: true,
            label: 'New project template (.json)',
            description: "Use a custom folder structure for new projects",
            advanced: true,
        },
    });
}