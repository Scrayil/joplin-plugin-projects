type BaseNode = { name: string };

type NotebookNode = BaseNode & {
    children: WikiNode[];
    content?: never; // Ensures content cannot exist
    is_todo?: never; // Ensures is_todo cannot exist
};

type NoteNode = BaseNode & {
    content?: string[];
    is_todo?: boolean;
    children?: never; // Ensures children cannot exist
};

export type WikiNode = NotebookNode | NoteNode;