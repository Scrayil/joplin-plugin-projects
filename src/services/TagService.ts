import joplin from 'api';
import { Config } from '../utils/constants';

/**
 * Handles all tag-related operations including retrieval, assignment, and cleanup.
 * Implements concurrency controls to optimize API usage.
 */
export class TagService {

    /**
     * Retrieves tags for multiple notes in parallel batches.
     * Uses `Promise.allSettled` to ensure partial failures do not block the entire operation.
     * 
     * @param noteIds List of note IDs to fetch tags for.
     * @returns A Map linking Note IDs to their associated tag titles.
     */
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
                } else {
                    console.error('TagService: Failed to fetch tags for a note', result.reason);
                }
            });
        }
        
        return noteTagsMap;
    }

    private async fetchTagsForNote(noteId: string): Promise<{ id: string, tags: string[] }> {
        const tags = await this.fetchAllItems(['notes', noteId, 'tags'], { fields: ['title'] });
        return {
            id: noteId,
            tags: tags.map((t: any) => t.title)
        };
    }

    /**
     * Updates the priority tag for a task.
     * Performs a robust case-insensitive cleanup of existing priority tags before assigning the new one.
     */
    public async updatePriorityTags(taskId: string, urgency: string): Promise<void> {
        const oldTags = await this.fetchAllItems(['notes', taskId, 'tags'], { fields: ['id', 'title'] });
        
        for (const tag of oldTags) {
            const lowerTitle = tag.title.toLowerCase();
            const keys = Config.TAGS.KEYWORDS;
            
            if (lowerTitle.includes(keys.HIGH) || 
                lowerTitle.includes(keys.MEDIUM) || 
                lowerTitle.includes(keys.LOW) || 
                lowerTitle.includes(keys.NORMAL)) {
                
                await joplin.data.delete(['tags', tag.id, 'notes', taskId]);
            }
        }

        let tagTitle: string = Config.TAGS.MEDIUM;
        if (urgency === 'high') tagTitle = Config.TAGS.HIGH;
        if (urgency === 'low') tagTitle = Config.TAGS.LOW;
        
        const tagId = await this.ensureTag(tagTitle);
        await joplin.data.post(['tags', tagId, 'notes'], null, { id: taskId });
    }

    /**
     * Toggles the "In Progress" status tag based on the provided state.
     */
    public async updateStatusTags(taskId: string, newStatus: string): Promise<void> {
        const search = await joplin.data.get(['search'], { query: Config.TAGS.IN_PROGRESS, type: 'tag' });
        let inProgressTagId = '';
        
        if (search.items.length > 0) {
            inProgressTagId = search.items[0].id;
        } else {
             if (newStatus === 'in_progress') {
                const newTag = await joplin.data.post(['tags'], null, { title: Config.TAGS.IN_PROGRESS });
                inProgressTagId = newTag.id;
             }
        }

        if (inProgressTagId) {
            if (newStatus === 'in_progress') {
                await joplin.data.post(['tags', inProgressTagId, 'notes'], null, { id: taskId });
            } else {
                try {
                    await joplin.data.delete(['tags', inProgressTagId, 'notes', taskId]);
                } catch (e) {
                    // Ignore if tag doesn't exist
                }
            }
        }
    }

    public async ensureTag(title: string): Promise<string> {
        const search = await joplin.data.get(['search'], { query: title, type: 'tag' });
        if (search.items.length > 0) {
            return search.items[0].id;
        }
        const newTag = await joplin.data.post(['tags'], null, { title: title });
        return newTag.id;
    }

    private async fetchAllItems(path: string[], query: any = null) {
        let page = 1;
        let items: any[] = [];
        let response;
        
        do {
            const options: any = { page: page, limit: 100 };
            if (query) {
                 Object.assign(options, query);
            }
            response = await joplin.data.get(path, options);
            items = items.concat(response.items);
            page++;
        } while (response.has_more);

        return items;
    }
}