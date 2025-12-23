import * as React from 'react';
import { Task } from '../types';

interface TimelineViewProps {
    tasks: Task[];
}

const TimelineView: React.FC<TimelineViewProps> = ({ tasks }) => {
    // Filter tasks that have a due date and sort by due date ascending
    const timelineTasks = tasks
        .filter(t => t.dueDate && t.dueDate > 0)
        .sort((a, b) => (a.dueDate || 0) - (b.dueDate || 0));

    if (timelineTasks.length === 0) {
        return (
            <div className="centered-view">
                <div style={{ textAlign: 'center', opacity: 0.6 }}>
                    <h3>No tasks with due dates found.</h3>
                    <p>Add a due date to a task to see it in the timeline.</p>
                </div>
            </div>
        );
    }

    // Helper to generate a consistent color for a projectId
    const getProjectColor = (projectId: string) => {
        let hash = 0;
        for (let i = 0; i < projectId.length; i++) {
            hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Use HSL for good distribution and professional look
        // Saturation around 60%, Lightness around 50% for visibility
        const h = Math.abs(hash) % 360;
        return `hsl(${h}, 65%, 50%)`;
    };

    // Determine the overall time range
    const minTime = Math.min(...timelineTasks.map(t => t.createdTime));
    const maxTime = Math.max(...timelineTasks.map(t => t.dueDate || 0));
    const totalDuration = maxTime - minTime;

    // Buffer range (5%)
    const buffer = totalDuration * 0.05;
    const startRange = minTime - buffer;
    const endRange = maxTime + buffer;
    const viewDuration = endRange - startRange;

    const getPosition = (time: number) => {
        return ((time - startRange) / viewDuration) * 100;
    };

    return (
        <div className="timeline-container" style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            background: 'var(--joplin-background-color)',
            overflow: 'hidden'
        }}>
            {/* Time Axis Header */}
            <div className="timeline-header" style={{ 
                height: '40px', 
                position: 'relative', 
                borderBottom: '1px solid var(--joplin-divider-color)',
                flexShrink: 0
            }}>
                {[0, 0.25, 0.5, 0.75, 1].map(fraction => {
                    const time = startRange + (viewDuration * fraction);
                    return (
                        <div key={fraction} style={{ 
                            position: 'absolute', 
                            left: `${fraction * 100}%`, 
                            transform: 'translateX(-50%)',
                            fontSize: '0.75rem',
                            color: 'var(--joplin-color)',
                            opacity: 0.6
                        }}>
                            {new Date(time).toLocaleDateString()}
                        </div>
                    );
                })}
            </div>

            {/* Timeline Rows */}
            <div className="timeline-body" style={{ 
                flex: 1, 
                overflowY: 'auto', 
                overflowX: 'hidden',
                padding: '20px 0'
            }}>
                {timelineTasks.map(task => {
                    const startPos = getPosition(task.createdTime);
                    const endPos = getPosition(task.dueDate || task.createdTime);
                    const width = Math.max(endPos - startPos, 0.5); // Min width for visibility
                    const projectColor = getProjectColor(task.projectId);

                    return (
                        <div key={task.id} className="timeline-row" style={{ 
                            height: '60px', 
                            position: 'relative',
                            borderBottom: '1px solid var(--joplin-divider-color)',
                            margin: '0 10px'
                        }}>
                            {/* Task Info Overlay */}
                            <div style={{ 
                                position: 'absolute', 
                                left: `${startPos}%`, 
                                top: '5px',
                                fontSize: '0.8rem',
                                color: 'var(--joplin-color)',
                                whiteSpace: 'nowrap',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span style={{ 
                                    width: '10px', 
                                    height: '10px', 
                                    borderRadius: '50%', 
                                    background: projectColor,
                                    display: 'inline-block',
                                    flexShrink: 0
                                }}></span>
                                <span style={{ color: 'orange' }}>[{task.projectName}]</span> {task.title}
                            </div>

                            {/* The Bar */}
                            <div 
                                className={`timeline-bar ${task.status === 'done' ? 'done' : ''}`}
                                style={{ 
                                    position: 'absolute',
                                    left: `${startPos}%`,
                                    width: `${width}%`,
                                    height: '8px',
                                    top: '30px',
                                    background: task.status === 'done' ? 'var(--joplin-divider-color)' : projectColor,
                                    borderRadius: '4px',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    opacity: task.status === 'done' ? 0.5 : 1
                                }}
                                title={`${task.title}\nDue: ${new Date(task.dueDate!).toLocaleString()}`}
                            ></div>

                            {/* Date Labels */}
                            <div style={{ 
                                position: 'absolute', 
                                left: `${startPos}%`, 
                                top: '42px',
                                fontSize: '0.65rem',
                                opacity: 0.5
                            }}>
                                {new Date(task.createdTime).toLocaleDateString()}
                            </div>
                            <div style={{ 
                                position: 'absolute', 
                                left: `${endPos}%`, 
                                top: '42px',
                                fontSize: '0.65rem',
                                transform: 'translateX(-100%)',
                                opacity: 0.5,
                                textAlign: 'right'
                            }}>
                                {new Date(task.dueDate!).toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TimelineView;
