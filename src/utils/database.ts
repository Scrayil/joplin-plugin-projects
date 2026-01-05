import joplin from "../../api";

/**
 * Creates a new note via the Joplin Data API.
 * @param title The note title.
 * @param content The markdown body content.
 * @param is_todo Whether the note is a to-do.
 * @param parent_id The ID of the parent notebook.
 */
export async function createNote(title: string, content: string, is_todo: boolean, parent_id: string = "") {
    return await joplin.data.post(["notes"], null, { title: title, is_todo: is_todo ? 1 : 0, body: content, parent_id: parent_id });
}

/**
 * Creates a new notebook (folder) via the Joplin Data API.
 * @param title The notebook title.
 * @param parent_id The ID of the parent notebook (optional).
 */
export async function createNotebook(title: string, parent_id: string = "") {
    return await joplin.data.post(["folders"], null, { title: title, parent_id: parent_id });
}

/**
 * Retrieves a notebook's title by its ID.
 * @param id The notebook ID.
 * @returns An object containing the title, or an empty object on error.
 */
export async function getNotebookTitleById(id: string) {
    try {
        return await joplin.data.get(["folders", id], { fields: ['title'] });
    } catch (err) {
        return {};
    }
}

/**
 * Updates an existing note.
 * @param id The note ID.
 * @param updates The object containing fields to update (e.g., body, todo_due).
 */
export async function updateNote(id: string, updates: any) {
    return await joplin.data.put(["notes", id], null, updates);
}

/**
 * Deletes a note by its ID.
 * @param id The note ID.
 */
export async function deleteNote(id: string) {
    return await joplin.data.delete(["notes", id]);
}

/**
 * Retrieves specific fields of a note.
 * @param id The note ID.
 * @param fields Array of field names to retrieve.
 */
export async function getNote(id: string, fields: string[] = ['id', 'title', 'body']) {
    return await joplin.data.get(["notes", id], { fields });
}

/**
 * Retrieves specific fields of a folder.
 * @param id The folder ID.
 * @param fields Array of field names to retrieve.
 */
export async function getFolder(id: string, fields: string[] = ['id', 'title']) {
    return await joplin.data.get(["folders", id], { fields });
}

/**
 * Searches for notes by a query string.
 * @param query The search query.
 * @param fields Array of field names to retrieve.
 */
export async function searchNotes(query: string, fields: string[] = ['id', 'title', 'parent_id']) {
    return await joplin.data.get(['search'], { query, type: 'note', fields });
}

/**
 * Generic helper to fetch all items from a paginated Joplin API endpoint.
 * @param path The API path segments.
 * @param query Optional query parameters.
 * @returns An array of all items.
 */
export async function fetchAllItems(path: string[], query: any = null) {
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

/**
 * Searches for tags by title.
 * @param title The tag title to search for.
 * @returns The search results.
 */
export async function searchTags(title: string) {
    return await joplin.data.get(['search'], { query: title, type: 'tag' });
}

/**
 * Creates a new tag.
 * @param title The tag title.
 * @returns The created tag object.
 */
export async function createTag(title: string) {
    return await joplin.data.post(['tags'], null, { title });
}

/**
 * Retrieves a tag by its ID to verify existence.
 * @param id The tag ID.
 * @param fields Fields to retrieve.
 */
export async function getTag(id: string, fields: string[] = ['id']) {
    return await joplin.data.get(['tags', id], { fields });
}

/**
 * Associates a tag with a note.
 * @param tagId The tag ID.
 * @param noteId The note ID.
 */
export async function addTagToNote(tagId: string, noteId: string) {
    return await joplin.data.post(['tags', tagId, 'notes'], null, { id: noteId });
}

/**
 * Removes a tag association from a note.
 * @param tagId The tag ID.
 * @param noteId The note ID.
 */
export async function removeTagFromNote(tagId: string, noteId: string) {
    return await joplin.data.delete(['tags', tagId, 'notes', noteId]);
}
