import joplin from "../../api";
import {SettingItemSubType, SettingItemType} from "../../api/types";
import {Config} from "./constants";

export const registerSettings = async () => {
    // Creating a new settings' section for the plugin
    await joplin.settings.registerSection(Config.SETTINGS.PROJECT_SECTION, {
        label: 'Projects',
        iconName: 'fas fa-folder',
    });

    await joplin.settings.registerSettings({
        [Config.SETTINGS.PROJECT_WIKI_TEMPLATE]: {
            value: '',
            type: SettingItemType.String,
            subType: SettingItemSubType.FilePath,
            section: Config.SETTINGS.PROJECT_SECTION,
            public: true,
            label: "Project Wiki template structure (.json)",
            description: "Select the .json file that defines the custom folder structure for new project wikis. Leave empty for default.",
            advanced: true
        }
    });

}