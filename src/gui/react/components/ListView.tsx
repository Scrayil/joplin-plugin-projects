import * as React from 'react';
import { Task } from '../types';

interface ListViewProps {
    tasks: Task[];
    onOpenNote: (taskId: string) => void;
}

const ListView: React.FC<ListViewProps> = ({ tasks, onOpenNote }) => {
    const getPriorityValue = (tags: string[]) => {
        // ... (sorting logic)
        if (tags.some(t => t.toLowerCase().includes('high'))) return 1;
        if (tags.some(t => t.toLowerCase().includes('normal') || t.toLowerCase().includes('medium'))) return 2;
        if (tags.some(t => t.toLowerCase().includes('low'))) return 3;
        return 4;
    };

    // Filter out completed tasks and apply multi-level sort
    const activeTasks = tasks
        .filter(t => t.status !== 'done')
        .sort((a, b) => {
            // 1. Due Date
            const dateA = a.dueDate ? a.dueDate : Number.MAX_VALUE;
            const dateB = b.dueDate ? b.dueDate : Number.MAX_VALUE;
            if (dateA !== dateB) return dateA - dateB;

            // 2. Priority
            const prioA = getPriorityValue(a.tags);
            const prioB = getPriorityValue(b.tags);
            if (prioA !== prioB) return prioA - prioB;

            // 3. Creation Date
            return a.createdTime - b.createdTime;
        });

    const getPriorityDisplay = (tags: string[]) => {
        // ...
        const priorityTag = tags.find(t => 
            t.toLowerCase().includes('high') || 
            t.toLowerCase().includes('medium') || 
            t.toLowerCase().includes('normal') || 
            t.toLowerCase().includes('low')
        );

        if (!priorityTag) return '-';

        let color = 'inherit';
        if (priorityTag.toLowerCase().includes('high')) color = '#e74c3c';
        else if (priorityTag.toLowerCase().includes('medium') || priorityTag.toLowerCase().includes('normal')) color = '#f39c12';
        else if (priorityTag.toLowerCase().includes('low')) color = '#3498db';

        return <span style={{ color, fontWeight: 'bold' }}>{priorityTag}</span>;
    };

    const getStatusDisplay = (status: string) => {
        // ...
        let label = 'To Do';
        let color = '#7f8c8d';
        let bg = 'rgba(127, 140, 141, 0.1)';

        if (status === 'in_progress') {
            label = 'In Progress';
            color = '#3498db';
            bg = 'rgba(52, 152, 219, 0.1)';
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

    const formatDate = (timestamp: number, includeTime: boolean = false) => {
        // ...
        const date = new Date(timestamp);
        const options: Intl.DateTimeFormatOptions = { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
            options.hour12 = true;
        }
        
        // Formats to "3 Dec 2025" or "3 Dec 2025 11:24 PM"
        return date.toLocaleDateString('en-GB', options).replace(/,/g, '');
    };

    return (
        <div className="list-view-container" style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
            <table style={{ 
                width: '100%', 
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
                        activeTasks.map(task => (
                            <tr key={task.id} style={{ 
                                borderBottom: '1px solid var(--joplin-divider-color)',
                                transition: 'background 0.2s',
                                cursor: 'pointer' // Added cursor
                            }} className="list-row" onClick={() => onOpenNote(task.id)}> {/* Added onClick */}
                                <td style={{ padding: '12px 10px', borderRight: '1px solid var(--joplin-divider-color)' }}>
                                    <span style={{ color: 'orange', fontWeight: 'bold' }}>[{task.projectName}]</span>
                                </td>
                                <td style={{ 
                                    padding: '12px 10px', 
                                    fontWeight: '500', 
                                    borderRight: '1px solid var(--joplin-divider-color)',
                                    maxWidth: '350px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }} title={task.title}>
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
                                        <span style={{ color: task.dueDate < Date.now() ? '#e74c3c' : 'inherit', fontWeight: task.dueDate < Date.now() ? 'bold' : 'normal' }}>
                                            {formatDate(task.dueDate, true)}
                                        </span>
                                    ) : (
                                        <span style={{ opacity: 0.3 }}>-</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            <style>{`
                .list-row:hover {
                    background-color: var(--joplin-background-color-hover3);
                }
            `}</style>
        </div>
    );
};

export default ListView;
