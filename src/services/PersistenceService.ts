import { getPluginDataFolder, readFileContent, writeFileContent } from '../utils/utils';
import * as path from 'path';
import * as fs from 'fs';

const STATE_FILE = 'plugin_state.json';

/**
 * Simple key-value store for plugin settings/state.
 * Persists data to a JSON file in the plugin's data directory.
 */
export class PersistenceService {
    private static instance: PersistenceService;
    private state: any = {};
    private loaded = false;

    private constructor() {}

    public static getInstance(): PersistenceService {
        if (!PersistenceService.instance) {
            PersistenceService.instance = new PersistenceService();
        }
        return PersistenceService.instance;
    }

    /**
     * Loads the state from the JSON file if not already loaded.
     */
    private async loadState() {
        if (this.loaded) return;
        const dataFolder = await getPluginDataFolder();
        const filePath = path.join(dataFolder, STATE_FILE);
        if (fs.existsSync(filePath)) {
            const content = await readFileContent(filePath);
            if (content) {
                try {
                    this.state = JSON.parse(content);
                } catch (e) {
                    console.error('Error parsing plugin state', e);
                }
            }
        }
        this.loaded = true;
    }

    /**
     * Saves the current state to the JSON file.
     */
    private async saveState() {
        const dataFolder = await getPluginDataFolder();
        const filePath = path.join(dataFolder, STATE_FILE);
        await writeFileContent(filePath, JSON.stringify(this.state, null, 2));
    }

    /**
     * Retrieves a value for the given key.
     * @param key The key to retrieve.
     */
    public async getValue(key: string): Promise<any> {
        await this.loadState();
        return this.state[key];
    }

    /**
     * Sets a value for the given key and persists the state.
     * @param key The key to set.
     * @param value The value to store.
     */
    public async setValue(key: string, value: any) {
        await this.loadState();
        this.state[key] = value;
        await this.saveState();
    }
}
