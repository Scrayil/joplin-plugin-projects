import * as React from 'react';
import { Task } from '../types';
import { formatDate } from '../utils';
import TaskContextMenu from './TaskContextMenu';

interface ListViewProps {
    tasks: Task[];
    onOpenNote: (taskId: string) => void;
    onEditTask: (task: Task) => void;
}

/**
 * Renders a sortable table view of active tasks.
 */
const ListView: React.FC<ListViewProps> = ({ tasks, onOpenNote, onEditTask }) => {
    const [contextMenu, setContextMenu] = React.useState<{x: number, y: number, task: Task} | null>(null);

    const activeTasks = tasks
        .filter(t => t.status !== 'done');

    /**
     * Renders the priority tag of a task as a colored label, or a dash when no priority
     * tag is present.
     * @param tags The tags of the task.
     */
    const getPriorityDisplay = (tags: string[]) => {
        const priorityTag = tags.find(t =>
            t.toLowerCase().includes('high') || 
            t.toLowerCase().includes('medium') || 
            t.toLowerCase().includes('normal') || 
            t.toLowerCase().includes('low')
        );

        if (!priorityTag) return '-';

        let color = 'inherit';
        if (priorityTag.toLowerCase().includes('high')) color = 'var(--prj-priority-high)';
        else if (priorityTag.toLowerCase().includes('medium') || priorityTag.toLowerCase().includes('normal')) color = 'var(--prj-priority-medium)';
        else if (priorityTag.toLowerCase().includes('low')) color = 'var(--prj-priority-low)';

        return <span style={{ color, fontWeight: 'bold' }}>{priorityTag}</span>;
    };

    /**
     * Renders a colored status badge for a task, distinguishing the in-progress state
     * from the default to-do state.
     * @param status The status of the task.
     */
    const getStatusDisplay = (status: string) => {
        let label = 'To Do';
        let color = 'var(--prj-status-todo)';
        let bg = 'var(--column-bg)';

        if (status === 'in_progress') {
            label = 'In Progress';
            color = 'var(--prj-status-inprogress)';
            bg = 'var(--prj-status-inprogress-bg)';
        }

        return (
            <span style={{ 
                color, 
                background: bg, 
                padding: '2px 8px', 
                borderRadius: '12px', 
                fontSize: '0.8rem', 
                fontWeight: 'bold',
                textTransform: 'uppercase'
            }}>
                {label}
            </span>
        );
    };

    /**
     * Requests deletion of a task from the backend.
     * @param task The task to delete.
     */
    const handleDeleteTask = (task: Task) => {
        window.webviewApi.postMessage({ name: 'deleteTask', payload: { task } });
    };

    /**
     * Opens the context menu for a task at the cursor position.
     * @param e The triggering mouse event.
     * @param task The task associated with the menu.
     */
    const handleContextMenu = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, task });
    };

    return (
        <div className="list-view-container" style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
            <table style={{ 
                width: '100%', 
                minWidth: '500px',
                borderCollapse: 'collapse', 
                color: 'var(--joplin-color)',
                fontSize: '0.95rem',
                border: '1px solid var(--joplin-divider-color)'
            }}>
                <thead>
                    <tr style={{ background: 'var(--column-bg)', borderBottom: '2px solid var(--joplin-divider-color)', textAlign: 'left' }}>
                        <th style={{ padding: '12px 10px', borderRight: '1px solid var(--joplin-divider-color)' }}>Project</th>
                        <th style={{ padding: '12px 10px', borderRight: '1px solid var(--joplin-divider-color)' }}>Task</th>
                        <th style={{ padding: '12px 10px', borderRight: '1px solid var(--joplin-divider-color)' }}>Status</th>
                        <th style={{ padding: '12px 10px', borderRight: '1px solid var(--joplin-divider-color)' }}>Priority</th>
                        <th style={{ padding: '12px 10px' }}>Due Date</th>
                    </tr>
                </thead>
                <tbody>
                    {activeTasks.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                                No active tasks found.
                            </td>
                        </tr>
                    ) : (
                        activeTasks.map(task => {
                            const isOverdue = task.dueDate > 0 && task.dueDate < Date.now() && task.status !== 'done';
                            const isApproaching = task.isApproaching && !isOverdue && task.status !== 'done';
                            
                            return (
                            <tr 
                                key={task.id} 
                                onDoubleClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                onContextMenu={(e) => handleContextMenu(e, task)}
                                className={`list-row ${isOverdue ? 'overdue' : ''} ${isApproaching ? 'approaching' : ''}`} 
                                style={{ borderBottom: '1px solid var(--joplin-divider-color)', transition: 'background 0.2s', cursor: 'pointer' }}
                                title={`${task.projectName}\n${task.title}${task.dueDate > 0 ? `\n${isOverdue ? '(Overdue) ' : (isApproaching ? '(Approaching) ' : '')}${formatDate(task.dueDate)}` : ''}`}
                            >
                                    <td style={{ 
                                        padding: '12px 10px', 
                                        borderRight: '1px solid var(--joplin-divider-color)',
                                        maxWidth: '120px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        <span style={{ color: 'var(--prj-project-tag)', fontWeight: 'bold', fontSize: '1rem' }}>[{task.projectName}]</span>
                                    </td>
                                    <td style={{ 
                                        padding: '12px 10px', 
                                        fontWeight: '500', 
                                        borderRight: '1px solid var(--joplin-divider-color)',
                                        maxWidth: '350px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {task.title}
                                    </td>
                                    <td style={{ padding: '12px 10px', borderRight: '1px solid var(--joplin-divider-color)' }}>
                                        {getStatusDisplay(task.status)}
                                    </td>
                                    <td style={{ padding: '12px 10px', borderRight: '1px solid var(--joplin-divider-color)' }}>
                                        {getPriorityDisplay(task.tags)}
                                    </td>
                                    <td style={{ padding: '12px 10px', fontSize: '0.85rem' }}>
                                        {task.dueDate && task.dueDate > 0 ? (
                                            <span style={{
                                                color: isOverdue ? 'var(--prj-overdue)' : (isApproaching ? 'var(--prj-approaching)' : 'inherit'),
                                                fontWeight: (isOverdue || isApproaching) ? 'bold' : 'normal'
                                            }}>
                                                {formatDate(task.dueDate, false)}
                                            </span>
                                        ) : (
                                            <span style={{ opacity: 0.3 }}>-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
            <style>{`
                .list-row:hover {
                    background-color: var(--joplin-background-color-hover3);
                }
            `}</style>
            {contextMenu && (
                <TaskContextMenu 
                    x={contextMenu.x} 
                    y={contextMenu.y} 
                    onClose={() => setContextMenu(null)}
                    onGuiEdit={() => onEditTask(contextMenu.task)}
                    onTextEdit={() => onOpenNote(contextMenu.task.id)}
                    onDelete={() => handleDeleteTask(contextMenu.task)}
                />
            )}
        </div>
    );
};

export default ListView;
