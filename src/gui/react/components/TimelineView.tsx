import * as React from 'react';
import { Task } from '../types';
import {formatDate} from "../utils";

interface TimelineViewProps {
    tasks: Task[];
    onOpenNote: (taskId: string) => void;
    onEditTask: (task: Task) => void;
}

/**
 * Renders a Gantt-like timeline view of tasks based on their creation and due dates.
 */
const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onOpenNote, onEditTask }) => {
    const getPriorityValue = (tags: string[]) => {
        if (tags.some(t => t.toLowerCase().includes('high'))) return 1;
        if (tags.some(t => t.toLowerCase().includes('normal') || t.toLowerCase().includes('medium'))) return 2;
        if (tags.some(t => t.toLowerCase().includes('low'))) return 3;
        return 4;
    };

    const timelineTasks = tasks
        .filter(t => t.dueDate && t.dueDate > 0 && t.status !== 'done')
        .sort((a, b) => {
            const dateA = a.dueDate || 0;
            const dateB = b.dueDate || 0;
            if (dateA !== dateB) return dateA - dateB;
            const prioA = getPriorityValue(a.tags);
            const prioB = getPriorityValue(b.tags);
            if (prioA !== prioB) return prioA - prioB;
            return a.createdTime - b.createdTime;
        });

    if (timelineTasks.length === 0) {
        return (
            <div className="centered-view">
                <div style={{ textAlign: 'center', opacity: 0.6 }}>
                    <h3>No active tasks with due dates found.</h3>
                    <p>Add a due date to a task to see it in the timeline.</p>
                </div>
            </div>
        );
    }

    const getProjectColor = (projectId: string) => {
        let hash = 0;
        for (let i = 0; i < projectId.length; i++) {
            hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return `hsl(${h}, 65%, 50%)`;
    };

    const now = Date.now();
    const minTime = Math.min(...timelineTasks.map(t => t.createdTime), now);
    const maxTime = Math.max(...timelineTasks.map(t => t.dueDate || 0), now);
    const totalDuration = maxTime - minTime;
    const buffer = totalDuration * 0.05;
    const startRange = minTime - buffer;
    const endRange = maxTime + buffer;
    const viewDuration = endRange - startRange;

    const getPosition = (time: number) => ((time - startRange) / viewDuration) * 100;
    const nowPos = getPosition(now);

    return (
        <div className="timeline-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--joplin-background-color)', overflow: 'hidden', position: 'relative', minWidth: '500px' }}>
                        <div className="timeline-header" style={{ height: '40px', position: 'relative', borderBottom: '1px solid var(--joplin-divider-color)', flexShrink: 0 }}>
                            {[0, 0.25, 0.5, 0.75, 1].map(fraction => {
                                const time = startRange + (viewDuration * fraction);
                                // Adjust alignment for first and last labels
                                let transform = 'translateX(-50%)';
                                if (fraction === 0) transform = 'none';
                                if (fraction === 1) transform = 'translateX(-100%)';
            
                                return (
                                    <div key={fraction} style={{ 
                                        position: 'absolute', 
                                        left: `${fraction * 100}%`, 
                                        transform: transform,
                                        fontSize: '0.75rem',
                                        color: 'var(--joplin-color)',
                                        opacity: 0.6,
                                        whiteSpace: 'nowrap',
                                        padding: '0 5px'
                                    }}>
                                        {formatDate(time, false)}
                                    </div>
                                );
                            })}
                        </div>

            <div className="timeline-body" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                <div style={{ position: 'relative', minHeight: '100%', padding: '20px 0', boxSizing: 'border-box' }}>
                    <div style={{ position: 'absolute', left: `${nowPos}%`, top: 0, bottom: 0, width: '2px', background: '#ff4757', zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', top: '5px', right: '6px', color: '#ff4757', fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>TODAY</div>
                        <div style={{ position: 'absolute', bottom: '5px', right: '6px', color: '#ff4757', fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>TODAY</div>
                    </div>

                    {timelineTasks.map(task => {
                        const startPos = getPosition(task.createdTime);
                        const endPos = getPosition(task.dueDate || task.createdTime);
                        const width = Math.max(endPos - startPos, 0.5);
                        const projectColor = getProjectColor(task.projectId);
                        const isOverdue = task.dueDate! > 0 && task.dueDate! < Date.now() && task.status !== 'done';

                        return (
                            <div key={task.id} className={`timeline-row ${isOverdue ? 'overdue' : ''}`} style={{ height: '60px', position: 'relative', borderBottom: '1px solid var(--joplin-divider-color)', margin: '0 10px', cursor: 'pointer' }} 
                                 onClick={() => onOpenNote(task.id)}
                                 onDoubleClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                 title={`${task.title}\nDue: ${formatDate(task.dueDate!)}`}>
                                <div style={{ position: 'absolute', left: `${startPos}%`, top: '5px', fontSize: '0.9rem', color: 'var(--joplin-color)', whiteSpace: 'nowrap', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: projectColor, display: 'inline-block', flexShrink: 0 }}></span>
                                    <span style={{ color: 'orange' }}>[{task.projectName}]</span> {task.title}
                                </div>
                                <div className={`timeline-bar ${task.status === 'done' ? 'done' : ''}`} style={{ 
                                    position: 'absolute', 
                                    left: `${startPos}%`, 
                                    width: `${width}%`, 
                                    height: '8px', 
                                    top: '30px', 
                                    background: task.status === 'done' ? 'var(--joplin-divider-color)' : projectColor, 
                                    borderRadius: '4px', 
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
                                    opacity: task.status === 'done' ? 0.5 : 1 
                                }}></div>
                                <div style={{ 
                                    position: 'absolute', 
                                    left: `${startPos}%`, 
                                    top: '42px', 
                                    fontSize: '0.65rem', 
                                    opacity: 0.5,
                                    whiteSpace: 'nowrap', // Ensure inline
                                    display: width < 15 ? 'none' : 'block'
                                }}>{formatDate(task.createdTime, false)}</div>
                                <div style={{ 
                                    position: 'absolute', 
                                    left: width < 15 ? `${startPos}%` : `${endPos}%`, 
                                    top: '42px', 
                                    fontSize: '0.65rem', 
                                    transform: width < 15 ? 'none' : 'translateX(-100%)', 
                                    opacity: 0.5, 
                                    textAlign: width < 15 ? 'left' : 'right',
                                    whiteSpace: 'nowrap' // Ensure inline
                                }}>{formatDate(task.dueDate!, false)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TimelineView;