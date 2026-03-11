import * as React from 'react';
import { Task } from '../types';
import {formatDate} from "../utils";
import TaskContextMenu from './TaskContextMenu';

interface TimelineViewProps {
    tasks: Task[];
    onOpenNote: (taskId: string) => void;
    onEditTask: (task: Task) => void;
}

/**
 * Renders a Gantt-like timeline view of tasks based on their creation and due dates.
 */
const TimelineView: React.FC<TimelineViewProps> = ({ tasks, onOpenNote, onEditTask }) => {
    const [contextMenu, setContextMenu] = React.useState<{x: number, y: number, task: Task} | null>(null);
    const [zoomLevel, setZoomLevel] = React.useState<number>(1); // 1 = Month, 2 = Week, 3 = Day
    const [visibleRange, setVisibleRange] = React.useState<{start: number, end: number}>({start: 0, end: 0});
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    const updateVisibleRange = React.useCallback(() => {
        if (!wrapperRef.current) return;
        const wrapper = wrapperRef.current;
        const scrollLeft = wrapper.scrollLeft;
        const viewportWidth = wrapper.clientWidth;
        const scrollWidth = wrapper.scrollWidth;

        const startPercent = scrollLeft / scrollWidth;
        const endPercent = (scrollLeft + viewportWidth) / scrollWidth;
    }, []);

    const getPriorityValue = (tags: string[]) => {
        if (tags.some(t => t.toLowerCase().includes('high'))) return 1;
        if (tags.some(t => t.toLowerCase().includes('normal') || t.toLowerCase().includes('medium'))) return 2;
        if (tags.some(t => t.toLowerCase().includes('low'))) return 3;
        return 4;
    };

    // We need to move the time calculations up so they can be used in the scroll listener
    const now = Date.now();
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

    const minTime = timelineTasks.length > 0 ? Math.min(...timelineTasks.map(t => t.startDate || t.createdTime), now) : now;
    const maxTime = timelineTasks.length > 0 ? Math.max(...timelineTasks.map(t => t.dueDate || 0), now) : now;
    
    const twoMonthsMs = 60 * 24 * 60 * 60 * 1000;
    const startRange = minTime - twoMonthsMs;
    const endRange = maxTime + twoMonthsMs;
    const viewDuration = endRange - startRange;

    const firstTaskTime = timelineTasks.length > 0 ? Math.min(...timelineTasks.map(t => t.startDate || t.createdTime)) : now;
    const lastTaskTime = timelineTasks.length > 0 ? Math.max(...timelineTasks.map(t => t.dueDate || 0)) : now;

    const handleScroll = () => {
        if (!wrapperRef.current) return;
        const wrapper = wrapperRef.current;
        const scrollLeft = wrapper.scrollLeft;
        const viewportWidth = wrapper.clientWidth;
        const scrollWidth = wrapper.scrollWidth;

        const startPercent = scrollLeft / scrollWidth;
        const endPercent = (scrollLeft + viewportWidth) / scrollWidth;

        const visibleStartTime = startRange + (startPercent * viewDuration);
        const visibleEndTime = startRange + (endPercent * viewDuration);

        setVisibleRange({ start: visibleStartTime, end: visibleEndTime });
    };

    React.useEffect(() => {
        // Initial calculation
        handleScroll();
        window.addEventListener('resize', handleScroll);
        return () => window.removeEventListener('resize', handleScroll);
    }, [viewDuration, startRange, zoomLevel]); // Re-run when timeline dimensions change

    const isTimeVisible = (time: number) => {
        // Add a small buffer (e.g., 1 day) to consider it "visible" so the button disables slightly before it hits the exact edge
        const buffer = 24 * 60 * 60 * 1000; 
        return time >= (visibleRange.start + buffer) && time <= (visibleRange.end - buffer);
    };

    const handleZoom = (direction: 'in' | 'out') => {
        if (!wrapperRef.current) return;
        
        const wrapper = wrapperRef.current;
        const currentScrollLeft = wrapper.scrollLeft;
        const viewportWidth = wrapper.clientWidth;
        const currentScrollWidth = wrapper.scrollWidth;
        
        // Find the percentage of the center point
        const centerPercent = (currentScrollLeft + viewportWidth / 2) / currentScrollWidth;

        const newZoom = direction === 'in' ? Math.min(3, zoomLevel + 1) : Math.max(1, zoomLevel - 1);
        if (newZoom === zoomLevel) return;

        setZoomLevel(newZoom);

        // We need to wait for React to re-render with the new width, then adjust scroll.
        // requestAnimationFrame ensures the DOM has updated.
        requestAnimationFrame(() => {
            if (!wrapperRef.current) return;
            const newScrollWidth = wrapperRef.current.scrollWidth;
            const targetScrollLeft = (centerPercent * newScrollWidth) - (viewportWidth / 2);
            wrapperRef.current.scrollLeft = targetScrollLeft;
        });
    };

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

    const handleDeleteTask = (task: Task) => {
        window.webviewApi.postMessage({ name: 'deleteTask', payload: { task } });
    };

    const handleContextMenu = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, task });
    };

    const getProjectColor = (projectId: string) => {
        let hash = 0;
        for (let i = 0; i < projectId.length; i++) {
            hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return `hsl(${h}, 65%, 50%)`;
    };

    const getPosition = (time: number) => ((time - startRange) / viewDuration) * 100;
    const nowPos = getPosition(now);

    const viewDurationDays = viewDuration / (1000 * 60 * 60 * 24);
    
    // Adjust minWidth based on zoom level to expand the timeline horizontally and prevent label overlap
    let pixelsPerDay = 15;
    if (zoomLevel === 2) pixelsPerDay = 40;
    if (zoomLevel === 3) pixelsPerDay = 100;
    
    const minWidthPx = Math.min(Math.max(800, viewDurationDays * pixelsPerDay), 100000);

    const markers: { time: number, fraction: number, label: string }[] = [];
    const startDate = new Date(startRange);
    const endDate = new Date(endRange);
    
    if (zoomLevel === 1) {
        // Month Level
        let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        while (current <= endDate) {
            const time = current.getTime();
            if (time >= startRange && time <= endRange) {
                markers.push({
                    time,
                    fraction: (time - startRange) / viewDuration,
                    label: current.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                });
            }
            current.setMonth(current.getMonth() + 1);
        }
    } else if (zoomLevel === 2) {
        // Week Level (Mondays)
        let current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        // Adjust to Monday
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);
        current = new Date(current.setDate(diff));
        
        while (current <= endDate) {
            const time = current.getTime();
            if (time >= startRange && time <= endRange) {
                markers.push({
                    time,
                    fraction: (time - startRange) / viewDuration,
                    label: current.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                });
            }
            current.setDate(current.getDate() + 7);
        }
    } else {
        // Day Level
        let current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        while (current <= endDate) {
            const time = current.getTime();
            if (time >= startRange && time <= endRange) {
                markers.push({
                    time,
                    fraction: (time - startRange) / viewDuration,
                    label: current.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                });
            }
            current.setDate(current.getDate() + 1);
        }
    }

    const handleJumpTo = (target: 'start' | 'today' | 'end') => {
        if (!wrapperRef.current) return;
        const wrapper = wrapperRef.current;
        const viewportWidth = wrapper.clientWidth;
        const scrollWidth = wrapper.scrollWidth;

        let targetPercent = 0;

        if (target === 'start') {
            const firstTaskTime = Math.min(...timelineTasks.map(t => t.startDate || t.createdTime));
            targetPercent = (firstTaskTime - startRange) / viewDuration;
        } else if (target === 'today') {
            targetPercent = (now - startRange) / viewDuration;
        } else if (target === 'end') {
            const lastTaskTime = Math.max(...timelineTasks.map(t => t.dueDate || 0));
            targetPercent = (lastTaskTime - startRange) / viewDuration;
        }

        const targetScrollLeft = (targetPercent * scrollWidth) - (viewportWidth / 2);
        
        wrapper.scrollTo({
            left: Math.max(0, Math.min(targetScrollLeft, scrollWidth - viewportWidth)),
            behavior: 'smooth'
        });
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--joplin-divider-color)', background: 'var(--joplin-background-color)' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => handleJumpTo('start')}
                        disabled={isTimeVisible(firstTaskTime)}
                        style={{ padding: '4px 10px', cursor: isTimeVisible(firstTaskTime) ? 'not-allowed' : 'pointer', background: 'var(--joplin-background-color)', color: 'var(--joplin-color)', border: '1px solid var(--joplin-divider-color)', borderRadius: '4px', opacity: isTimeVisible(firstTaskTime) ? 0.5 : 1 }}
                    >
                        ⟸ First Task
                    </button>
                    <button 
                        onClick={() => handleJumpTo('today')}
                        disabled={isTimeVisible(now)}
                        style={{ padding: '4px 10px', cursor: isTimeVisible(now) ? 'not-allowed' : 'pointer', background: 'var(--joplin-background-color)', color: isTimeVisible(now) ? 'var(--joplin-color)' : '#ff4757', border: '1px solid var(--joplin-divider-color)', borderRadius: '4px', fontWeight: 'bold', opacity: isTimeVisible(now) ? 0.5 : 1 }}
                    >
                        ⊙ Today
                    </button>
                    <button 
                        onClick={() => handleJumpTo('end')}
                        disabled={isTimeVisible(lastTaskTime)}
                        style={{ padding: '4px 10px', cursor: isTimeVisible(lastTaskTime) ? 'not-allowed' : 'pointer', background: 'var(--joplin-background-color)', color: 'var(--joplin-color)', border: '1px solid var(--joplin-divider-color)', borderRadius: '4px', opacity: isTimeVisible(lastTaskTime) ? 0.5 : 1 }}
                    >
                        Last Task ⟹
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => handleZoom('out')} 
                        disabled={zoomLevel === 1}
                        style={{ padding: '4px 10px', cursor: zoomLevel === 1 ? 'not-allowed' : 'pointer', background: 'var(--joplin-background-color)', color: 'var(--joplin-color)', border: '1px solid var(--joplin-divider-color)', borderRadius: '4px', opacity: zoomLevel === 1 ? 0.5 : 1 }}
                    >
                        Zoom Out (-)
                    </button>
                    <button 
                        onClick={() => handleZoom('in')} 
                        disabled={zoomLevel === 3}
                        style={{ padding: '4px 10px', cursor: zoomLevel === 3 ? 'not-allowed' : 'pointer', background: 'var(--joplin-background-color)', color: 'var(--joplin-color)', border: '1px solid var(--joplin-divider-color)', borderRadius: '4px', opacity: zoomLevel === 3 ? 0.5 : 1 }}
                    >
                        Zoom In (+)
                    </button>
                </div>
            </div>
            
        <div ref={wrapperRef} onScroll={handleScroll} className="timeline-wrapper" style={{ flex: 1, width: '100%', overflowX: 'auto', overflowY: 'hidden', background: 'var(--joplin-background-color)' }}>
            <div style={{ minWidth: `${Math.max(minWidthPx, 800)}px`, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="timeline-header" style={{ height: '40px', position: 'relative', borderBottom: '1px solid var(--joplin-divider-color)', flexShrink: 0, width: '100%' }}>
                    {markers.map(marker => (
                        <div key={marker.time} style={{ 
                            position: 'absolute', 
                            left: `${marker.fraction * 100}%`, 
                            transform: 'translateX(-50%)',
                            fontSize: '0.75rem',
                            color: 'var(--joplin-color)',
                            opacity: 0.6,
                            whiteSpace: 'nowrap',
                            padding: '0 5px'
                        }}>
                            {marker.label}
                        </div>
                    ))}
                </div>

                <div className="timeline-body" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%' }}>
                    <div style={{ position: 'relative', minHeight: '100%', padding: '20px 0', boxSizing: 'border-box' }}>
                    {/* Vertical Dividers */}
                    {markers.map(marker => (
                        <div key={`div-${marker.time}`} style={{
                            position: 'absolute',
                            left: `${marker.fraction * 100}%`,
                            top: 0,
                            bottom: 0,
                            width: '1px',
                            background: 'var(--joplin-divider-color)',
                            opacity: 1,
                            zIndex: 1,
                            pointerEvents: 'none'
                        }}></div>
                    ))}

                    <div style={{ position: 'absolute', left: `${nowPos}%`, top: 0, bottom: 0, width: '2px', background: '#ff4757', zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', top: '5px', right: '6px', color: '#ff4757', fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>TODAY</div>
                        <div style={{ position: 'absolute', bottom: '5px', right: '6px', color: '#ff4757', fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>TODAY</div>
                    </div>

                    {timelineTasks.map(task => {
                        const effectiveStart = task.startDate || task.createdTime;
                        const startPos = getPosition(effectiveStart);
                        const endPos = getPosition(task.dueDate || effectiveStart);
                        const width = Math.max(endPos - startPos, 0.5);
                        const projectColor = getProjectColor(task.projectId);
                        const isOverdue = task.dueDate! > 0 && task.dueDate! < Date.now() && task.status !== 'done';
                        const isApproaching = task.isApproaching && !isOverdue && task.status !== 'done';

                        return (
                            <div key={task.id} className={`timeline-row ${isOverdue ? 'overdue' : ''} ${isApproaching ? 'approaching' : ''}`} style={{ height: '60px', position: 'relative', borderBottom: '1px solid var(--joplin-divider-color)', margin: '0 10px', cursor: 'pointer' }} 
                                 onDoubleClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                 onContextMenu={(e) => handleContextMenu(e, task)}
                                 title={`${task.projectName}\n${task.title}${task.startDate && task.startDate > 0 ? `\nStart: ${formatDate(task.startDate)}` : ''}${task.dueDate! > 0 ? `\n${isOverdue ? '(Overdue) ' : (isApproaching ? '(Approaching) ' : '')}Due: ${formatDate(task.dueDate!)}` : ''}`}>
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
                                }}>{formatDate(effectiveStart, false)}</div>
                                <div style={{ 
                                    position: 'absolute', 
                                    left: width < 15 ? `${startPos}%` : `${endPos}%`, 
                                    top: '42px', 
                                    fontSize: '0.65rem', 
                                    transform: width < 15 ? 'none' : 'translateX(-100%)', 
                                    opacity: (isOverdue || isApproaching) ? 1 : 0.5, 
                                    color: isOverdue ? '#e74c3c' : (isApproaching ? '#e67e22' : 'inherit'),
                                    fontWeight: (isOverdue || isApproaching) ? 'bold' : 'normal',
                                    textAlign: width < 15 ? 'left' : 'right',
                                    whiteSpace: 'nowrap' // Ensure inline
                                }}>{formatDate(task.dueDate!, false)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
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
        </div>
        </div>
    );
};

export default TimelineView;