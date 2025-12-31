import Logger from "@joplin/utils/Logger";
import * as fs from "node:fs";
import joplin from "../../api";
import {Config} from "./constants";

const logger = Logger.create('Projects: Utils');

/**
 * Retrieves the installation directory of the plugin.
 */
export async function getPluginFolder() {
    return await joplin.plugins.installationDir()
}

/**
 * Retrieves the data directory for the plugin.
 */
export async function getPluginDataFolder() {
    return await joplin.plugins.dataDir()
}


/**
 * Synchronously reads the content of a file.
 * @param filePath The path to the file.
 * @returns The content of the file as a string, or an empty string on error.
 */
export function readFileContent(filePath: string) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        logger.error(err);
        return "";
    }
}

/**
 * Synchronously writes content to a file.
 * @param filePath The path to the file.
 * @param content The content to write.
 */
export function writeFileContent(filePath: string, content: string) {
    fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o664 });
}

/**
 * Retrieves a plugin setting value.
 * @param settingKey The key of the setting.
 */
export async function getSettingValue(settingKey: string) {
    try{
        const settingData = await joplin.settings.values([settingKey]);
        if (settingData && Object.keys(settingData).includes(settingKey)) {
            return settingData[settingKey].toString();
        }
    } catch (error) {
        logger.error(error);
        return "";
    }
}

/**
 * Sets a plugin setting value.
 * @param settingKey The key of the setting.
 * @param value The value to set.
 */
export async function setSettingValue(settingKey: string, value: any) {
    try {
        await joplin.settings.setValue(settingKey, value);
    } catch (error) {
        logger.error(error);
        return "";
    }
}