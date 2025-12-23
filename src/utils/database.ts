import joplin from "../../api";

export async function createNote(title:string, content: string, is_todo: boolean, parent_id:string="") {
    const newNote = await joplin.data.post(["notes"], null, { title: title, is_todo: is_todo ? 1 : 0, body: content, parent_id: parent_id });
    // Retrieves the id of the existing tag or creates it
    const tagId = await getOrCreateTagId("🟠 medium");
    // Binds the tag to the newly created note
    await joplin.data.post(['tags', tagId, 'notes'], {
        id: newNote.id
    });
    return newNote;
}


async function getOrCreateTagId(title: string): Promise<string> {
    // Looking for the tag in the database
    let pageNum = 1;
    let hasMore = true;

    while (hasMore) {
        const result = await joplin.data.get(['tags'], { page: pageNum });
        const existingTag = result.items.find(t => t.title.toLowerCase() === title.toLowerCase());

        if (existingTag) {
            return existingTag.id;
        }

        hasMore = result.has_more;
        pageNum++;
    }

    // Creating the tag if it doesn't exist already
    const newTag = await joplin.data.post(['tags'], {
        title: title
    });

    return newTag.id;
}

export async function createNotebook(title:string, parent_id:string="") {
    return await joplin.data.post(["folders"], null, { title: title, parent_id: parent_id });
}

export async function getNotebookTitleById(id:string) {
    try {
        return await joplin.data.get(["folders", id], {fields: ['title']});
    } catch(err) {
        console.log(err);
        return {};
    }
}