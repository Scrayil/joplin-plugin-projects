/**
 * Represents a subtask within a task note.
 */
export interface SubTask {
    title: string;
    completed: boolean;
}

/**
 * Represents the core task data structure used in the dashboard.
 */
export interface Task {
    id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'done' | 'overdue';
    dueDate?: number;
    createdTime: number;
    completedTime?: number;
    projectId: string;
    projectName: string;
    tags: string[];
    subTasks: SubTask[];
}

/**
 * Represents a project (Joplin notebook).
 */
export interface Project {
    id: string;
    name: string;
}

/**
 * The full data payload received from the plugin backend.
 */
export interface DashboardData {
    projects: Project[];
    tasks: Task[];
}

export interface WikiNode {
    id: string;
    title: string;
    type: 'folder' | 'note';
    level: number;
    body: string;
    is_todo?: boolean;
    todo_completed?: number;
}

declare global {
    interface Window {
        webviewApi: {
            postMessage: (message: any) => Promise<any>;
            onMessage: (callback: (message: any) => void) => void;
        };
    }
}

