import Logger from "@joplin/utils/Logger";
import * as fs from "node:fs";
import joplin from "../../api";
import {Config} from "./constants";
import {WikiNode} from "./types";

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
        if (err.code !== 'ENOENT') {
            logger.error(err);
        }
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

/**
 * Validates a JSON object against the WikiNode structure recursively.
 * Implements strict key checking and mutual exclusivity:
 * A node cannot have both 'children' and ('content' or 'is_todo').
 *
 * @param data - The object to validate.
 * @returns boolean - True if the object is a valid WikiNode.
 */
export function isValidWikiStructure(data: any): data is WikiNode {
    // 1. Basic type check
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        console.error("Validation Error: Node must be a non-null object.");
        return false;
    }

    // 2. Strict Key Validation
    const allowedKeys = ['name', 'is_todo', 'content', 'children'];
    const actualKeys = Object.keys(data);
    const unknownKeys = actualKeys.filter(key => !allowedKeys.includes(key));

    if (unknownKeys.length > 0) {
        console.error(`Validation Error: Unauthorized keys found: [${unknownKeys.join(', ')}] in node "${data.name || 'unknown'}".`);
        return false;
    }

    // 3. Mandatory Field: 'name'
    if (typeof data.name !== 'string' || data.name.trim() === "") {
        console.error("Validation Error: 'name' is mandatory and must be a non-empty string.");
        return false;
    }

    // --- NEW: Mutual Exclusion Check ---
    const hasChildren = data.hasOwnProperty('children');
    const hasContent = data.hasOwnProperty('content');
    const hasIsTodo = data.hasOwnProperty('is_todo');

    if (hasChildren && (hasContent || hasIsTodo)) {
        console.error(`Validation Error in "${data.name}": A node cannot contain both 'children' and 'content'/'is_todo'. It must be either a Notebook (folder) or a Note.`);
        return false;
    }
    // -----------------------------------

    // 4. 'is_todo' validation
    if (hasIsTodo) {
        if (typeof data.is_todo !== 'boolean') {
            console.error(`Validation Error in "${data.name}": 'is_todo' must be a boolean.`);
            return false;
        }
    }

    // 5. 'content' validation
    if (hasContent) {
        if (!Array.isArray(data.content) || !data.content.every((item: any) => typeof item === 'string')) {
            console.error(`Validation Error in "${data.name}": 'content' must be an array of strings.`);
            return false;
        }
    }

    // 6. 'children' validation and recursion
    if (hasChildren) {
        if (!Array.isArray(data.children)) {
            console.error(`Validation Error in "${data.name}": 'children' must be an array.`);
            return false;
        }

        for (const child of data.children) {
            if (!isValidWikiStructure(child)) {
                return false;
            }
        }
    }

    return true;
}
