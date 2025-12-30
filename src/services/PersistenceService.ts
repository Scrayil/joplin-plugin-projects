import { getPluginDataFolder, readFileContent, writeFileContent } from '../utils/utils';
import * as path from 'path';
import * as fs from 'fs';

const STATE_FILE = 'plugin_state.json';

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

    private async saveState() {
        const dataFolder = await getPluginDataFolder();
        const filePath = path.join(dataFolder, STATE_FILE);
        await writeFileContent(filePath, JSON.stringify(this.state, null, 2));
    }

    public async getValue(key: string): Promise<any> {
        await this.loadState();
        return this.state[key];
    }

    public async setValue(key: string, value: any) {
        await this.loadState();
        this.state[key] = value;
        await this.saveState();
    }
}
