import { Config } from "../utils/constants";
import { createNote, updateNote, getNote, searchNotes } from "../utils/database";
import { getOrInitProjectRootId } from "../utils/projects";

/**
 * Service dedicated to synchronizing plugin data across multiple devices.
 * It uses a dedicated "Sync Note" within the Projects root folder to store 
 * configuration data like custom Wiki orders.
 */
export class SyncService {
    private static instance: SyncService;
    private syncNoteId: string | null = null;
    private cache: any = null;
    private lastFetchTime: number = 0;
    private readonly CACHE_TTL = 30000; // 30 seconds

    private constructor() {}

    public static getInstance(): SyncService {
        if (!SyncService.instance) {
            SyncService.instance = new SyncService();
        }
        return SyncService.instance;
    }

    /**
     * Locates the sync note in the root folder or creates it if missing.
     */
    private async findOrCreateSyncNote(): Promise<string | null> {
        if (this.syncNoteId) return this.syncNoteId;

        const rootId = await getOrInitProjectRootId(false);
        if (!rootId) return null;

        // Search for the sync note specifically within the root folder
        const query = `title:"${Config.SYNC.NOTE_TITLE}"`;
        const searchResults = await searchNotes(query, ['id', 'parent_id', 'title']);
        
        const validNote = searchResults.items.find((n: any) => n.parent_id === rootId);
        if (validNote) {
            this.syncNoteId = validNote.id;
            return this.syncNoteId;
        }

        // Not found, create it as a hidden-ish system note
        const newNote = await createNote(Config.SYNC.NOTE_TITLE, Config.SYNC.BODY, false, rootId);
        this.syncNoteId = newNote.id;
        return this.syncNoteId;
    }

    /**
     * Retrieves the synchronized wiki orders.
     * Uses a time-based cache to avoid redundant API calls during rapid UI updates.
     */
    public async getWikiOrders(): Promise<any> {
        const now = Date.now();
        if (this.cache && (now - this.lastFetchTime < this.CACHE_TTL)) {
            return this.cache;
        }

        const noteId = await this.findOrCreateSyncNote();
        if (!noteId) return {};

        try {
            const note = await getNote(noteId, ['body']);
            const jsonMatch = note.body.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                this.cache = JSON.parse(jsonMatch[1]);
                this.lastFetchTime = now;
                return this.cache;
            }
        } catch (e) {
            console.error("SyncService: Error retrieving wiki orders", e);
        }
        
        return {};
    }

    /**
     * Saves the wiki orders to the sync note.
     * Updates the local cache immediately for UI responsiveness.
     */
    public async saveWikiOrders(orders: any) {
        this.cache = orders;
        this.lastFetchTime = Date.now();

        const noteId = await this.findOrCreateSyncNote();
        if (!noteId) return;

        const jsonContent = JSON.stringify(orders, null, 2);
        const newBody = `${Config.SYNC.BODY}\n\n\`\`\`json\n${jsonContent}\n\`\`\``;
        
        try {
            await updateNote(noteId, { body: newBody });
        } catch (e) {
            console.error("SyncService: Error saving wiki orders", e);
        }
    }

    /**
     * Invalidate cache to force a fresh fetch from Joplin.
     */
    public invalidateCache() {
        this.cache = null;
        this.lastFetchTime = 0;
    }
}
