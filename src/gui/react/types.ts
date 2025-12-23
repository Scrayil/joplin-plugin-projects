export interface SubTask {
    title: string;
    completed: boolean;
}

export interface Task {
    id: string;
    title: string;
    status: 'todo' | 'in_progress' | 'done' | 'overdue';
    dueDate?: number;
    createdTime: number;
    projectId: string;
    projectName: string;
    tags: string[];
    subTasks: SubTask[];
}

export interface Project {
    id: string;
    name: string;
}

export interface DashboardData {
    projects: Project[];
    tasks: Task[];
}

declare global {
    interface Window {
        webviewApi: {
            postMessage: (message: any) => Promise<any>;
            onMessage: (callback: (message: any) => void) => void;
        };
    }
}
