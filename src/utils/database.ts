import joplin from "../../api";

/**
 * Creates a new note via the Joplin Data API.
 * @param title The note title.
 * @param content The markdown body content.
 * @param is_todo Whether the note is a to-do.
 * @param parent_id The ID of the parent notebook.
 */
export async function createNote(title:string, content: string, is_todo: boolean, parent_id:string="") {
    return await joplin.data.post(["notes"], null, { title: title, is_todo: is_todo ? 1 : 0, body: content, parent_id: parent_id });
}

/**
 * Creates a new notebook (folder) via the Joplin Data API.
 * @param title The notebook title.
 * @param parent_id The ID of the parent notebook (optional).
 */
export async function createNotebook(title:string, parent_id:string="") {
    return await joplin.data.post(["folders"], null, { title: title, parent_id: parent_id });
}

/**
 * Retrieves a notebook's title by its ID.
 * @param id The notebook ID.
 * @returns An object containing the title, or an empty object on error.
 */
export async function getNotebookTitleById(id:string) {
    try {
        return await joplin.data.get(["folders", id], {fields: ['title']});
    } catch(err) {
        return {};
    }
}