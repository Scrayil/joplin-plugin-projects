import { Config } from '../utils/constants';
import { getPluginDataFolder, readFileContent, writeFileContent } from '../utils/utils';
import { getTag, searchTags, createTag, addTagToNote, removeTagFromNote, fetchAllItems } from '../utils/database';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Handles all tag-related operations including retrieval, assignment, cleanup, and persistence of tag IDs.
 */
export class TagService {
    private tagMeta: { [key: string]: string } = {};
    private metaLoaded = false;

    constructor() {
        this.loadTagMeta();
    }

    private async loadTagMeta() {
        if (this.metaLoaded) return;
        try {
            const dataFolder = await getPluginDataFolder();
            const metaPath = path.join(dataFolder, "tag_meta.json");
            if (fs.existsSync(metaPath)) {
                const content = await readFileContent(metaPath);
                if (content) {
                    this.tagMeta = JSON.parse(content);
                }
            }
            this.metaLoaded = true;
        } catch (error) {
            console.error("TagService: Error loading tag meta", error);
        }
    }

    private async saveTagMeta() {
        try {
            const dataFolder = await getPluginDataFolder();
            const metaPath = path.join(dataFolder, "tag_meta.json");
            await writeFileContent(metaPath, JSON.stringify(this.tagMeta, null, 2));
        } catch (error) {
            console.error("TagService: Error saving tag meta", error);
        }
    }

    /**
     * Resolves the correct Tag ID based on type and default title.
     * Respects user's manual renaming by trusting the stored ID if valid.
     */
    private async getEffectiveTagId(type: string, defaultTitle: string): Promise<string> {
        await this.loadTagMeta();

        let tagId = this.tagMeta[type];

        if (tagId) {
            try {
                // Check if tag still exists
                const tag = await getTag(tagId, ['id']);
                if (tag) {
                    // Tag exists, we use it regardless of its current title
                    return tagId;
                }
            } catch (e) {
                console.warn(`TagService: Stored tag ${type} (${tagId}) not found. Resetting.`);
            }
        }

        // ID not found or invalid. Search by name or create.
        const search = await searchTags(defaultTitle);
        if (search.items.length > 0) {
            tagId = search.items[0].id;
        } else {
            const newTag = await createTag(defaultTitle);
            tagId = newTag.id;
        }

        // Save new mapping
        this.tagMeta[type] = tagId;
        await this.saveTagMeta();

        return tagId;
    }

    public async getTagsForNotes(noteIds: string[]): Promise<Map<string, string[]>> {
        const noteTagsMap = new Map<string, string[]>();
        const batchSize = 10;
        
        for (let i = 0; i < noteIds.length; i += batchSize) {
            const batch = noteIds.slice(i, i + batchSize);
            const promises = batch.map(id => this.fetchTagsForNote(id));
            
            const results = await Promise.allSettled(promises);
            
            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    const { id, tags } = result.value;
                    noteTagsMap.set(id, tags);
                }
            });
        }
        
        return noteTagsMap;
    }

    /**
     * Helper to fetch tags for a single note.
     */
    private async fetchTagsForNote(noteId: string): Promise<{ id: string, tags: string[] }> {
        const tags = await fetchAllItems(['notes', noteId, 'tags'], { fields: ['title'] });
        return {
            id: noteId,
            tags: tags.map((t: any) => t.title)
        };
    }

    public async updatePriorityTags(taskId: string, urgency: string): Promise<void> {
        // Resolve all priority tag IDs to ensure we clean up correctly
        const highId = await this.getEffectiveTagId('HIGH', Config.TAGS.HIGH);
        const mediumId = await this.getEffectiveTagId('MEDIUM', Config.TAGS.MEDIUM);
        const lowId = await this.getEffectiveTagId('LOW', Config.TAGS.LOW);
        
        // Remove ANY of these tags from the note
        const idsToRemove = [highId, mediumId, lowId];
        for (const id of idsToRemove) {
            try {
                await removeTagFromNote(id, taskId);
            } catch (e) { /* Ignore if not present */ }
        }

        // Add the requested one
        let targetId = mediumId;
        if (urgency === 'high') targetId = highId;
        if (urgency === 'low') targetId = lowId;
        
        await addTagToNote(targetId, taskId);
    }

    public async updateStatusTags(taskId: string, newStatus: string): Promise<void> {
        const inProgressId = await this.getEffectiveTagId('IN_PROGRESS', Config.TAGS.IN_PROGRESS);

        if (newStatus === 'in_progress') {
            await addTagToNote(inProgressId, taskId);
        } else {
            try {
                await removeTagFromNote(inProgressId, taskId);
            } catch (e) { /* Ignore */ }
        }
    }
}
