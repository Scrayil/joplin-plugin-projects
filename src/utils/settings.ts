import joplin from "../../api";
import {SettingItemSubType, SettingItemType} from "../../api/types";
import {Config} from "./constants";

/**
 * Registers the plugin settings section and its individual settings: the custom
 * wiki template file path and the approaching-deadline warning threshold in days.
 */
export const registerSettings = async () => {
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
        },
        [Config.SETTINGS.PROJECT_APPROACHING_DEADLINE]: {
            value: 7,
            type: SettingItemType.Int,
            minimum: 1,
            maximum: 100,
            section: Config.SETTINGS.PROJECT_SECTION,
            public: true,
            label: "Approaching deadline warning (days)",
            description: "Tasks due within this number of days will be highlighted in orange."
        }
    });

}