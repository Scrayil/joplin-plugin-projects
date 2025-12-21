import Logger from "@joplin/utils/Logger";
import * as fs from "node:fs";
import joplin from "../../api";
import {Config} from "./constants";

const logger = Logger.create('Projects: Utils');

export async function getPluginFolder() {
    return await joplin.plugins.installationDir()
}

export async function getPluginDataFolder() {
    return await joplin.plugins.dataDir()
}


export function readFileContent(filePath: string) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        logger.error(err);
        return "";
    }
}

export function writeFileContent(filePath: string, content: string) {
    fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o664 });
}

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

export async function setSettingValue(settingKey: string, value: any) {
    try {
        await joplin.settings.setValue(settingKey, value);
    } catch (error) {
        logger.error(error);
        return "";
    }
}