import joplin from "../../api";

export async function createNote(title:string, content: string, is_todo: boolean, parent_id:string="") {
    return await joplin.data.post(["notes"], null, { title: title, is_todo: is_todo ? 1 : 0, body: content, parent_id: parent_id });
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