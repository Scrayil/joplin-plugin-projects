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
    const [containerWidth, setContainerWidth] = React.useState<number>(800);
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const bodyRef = React.useRef<HTMLDivElement>(null);

    const [draggingDep, setDraggingDep] = React.useState<{id: string, type: 'start'|'end', projectId: string} | null>(null);
    const [mousePos, setMousePos] = React.useState<{x: number, y: number} | null>(null);

    // States for Task Bar Drag & Drop (Scheduling)
    const [draggingTask, setDraggingTask] = React.useState<{ id: string, initialX: number, initialStart: number, initialDue: number, type: 'move' | 'resizeStart' | 'resizeEnd' } | null>(null);
    const [tempTaskDates, setTempTaskDates] = React.useState<Record<string, { start: number, end: number }>>({});

    // Time calculations live at component scope so the scroll listener and effects can reuse them.
    const now = Date.now();
    const timelineTasks = tasks
        .filter(t => t.dueDate && t.dueDate > 0 && t.status !== 'done');

    const minTime = timelineTasks.length > 0 ? Math.min(...timelineTasks.map(t => t.startDate || t.createdTime), now) : now;
    const maxTime = timelineTasks.length > 0 ? Math.max(...timelineTasks.map(t => t.dueDate || 0), now) : now;
    
    const twoMonthsMs = 60 * 24 * 60 * 60 * 1000;
    const startRange = minTime - twoMonthsMs;
    const endRange = maxTime + twoMonthsMs;
    const viewDuration = endRange - startRange;

    React.useEffect(() => {
        if (!draggingDep && !draggingTask) return;
        
        const onMove = (e: MouseEvent) => {
            if (bodyRef.current) {
                const rect = bodyRef.current.getBoundingClientRect();
                const currentX = e.clientX - rect.left + bodyRef.current.scrollLeft;
                
                if (draggingDep) {
                    setMousePos({ 
                        x: currentX, 
                        y: e.clientY - rect.top + bodyRef.current.scrollTop 
                    });
                } else if (draggingTask) {
                    const deltaX = currentX - draggingTask.initialX;
                    const containerW = containerWidth || 800; // fallback
                    const timePerPixel = viewDuration / containerW;
                    const deltaTime = deltaX * timePerPixel;
                    
                    let newStart = draggingTask.initialStart;
                    let newEnd = draggingTask.initialDue;
                    
                    if (draggingTask.type === 'move') {
                        newStart += deltaTime;
                        newEnd += deltaTime;
                    } else if (draggingTask.type === 'resizeStart') {
                        newStart = Math.min(draggingTask.initialStart + deltaTime, newEnd - (24*60*60*1000)); // prevent overlapping past end
                    } else if (draggingTask.type === 'resizeEnd') {
                        newEnd = Math.max(draggingTask.initialDue + deltaTime, newStart + (24*60*60*1000)); // prevent overlapping past start
                    }
                    
                    setTempTaskDates(prev => ({
                        ...prev,
                        [draggingTask.id]: { start: newStart, end: newEnd }
                    }));
                }
            }
        };
        const onUp = () => {
            if (draggingTask) {
                const tempDates = tempTaskDates[draggingTask.id];
                if (tempDates) {
                    const updatedTask = tasks.find(t => t.id === draggingTask.id);
                    if (updatedTask) {
                         window.webviewApi.postMessage({
                             name: 'updateTaskDates',
                             payload: { 
                                 taskId: draggingTask.id, 
                                 startDate: tempDates.start, 
                                 dueDate: tempDates.end,
                                 subTasks: updatedTask.subTasks,
                                 urgency: updatedTask.tags.find(t => ['high','medium','normal','low'].includes(t.toLowerCase())) || 'normal'
                             }
                         });
                    }
                }
                setDraggingTask(null);
                setTempTaskDates({});
            }
            setDraggingDep(null);
            setMousePos(null);
        };
        
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [draggingDep, draggingTask, containerWidth, viewDuration, tempTaskDates, tasks]);

    /**
     * Creates a dependency between two tasks based on the handles involved in the drag,
     * deriving the dependency type (FS, SS, FF, SF) from the source and target handles.
     * The dependency is stored on the target task. Cross-project links, cycles, and
     * duplicates are rejected.
     * @param sourceId The ID of the task the drag started from.
     * @param sourceType The handle the drag started from ('start' or 'end').
     * @param targetId The ID of the task the drag ended on.
     * @param targetType The handle the drag ended on ('start' or 'end').
     */
    const handleCreateDependency = (sourceId: string, sourceType: 'start'|'end', targetId: string, targetType: 'start'|'end') => {
        if (sourceId === targetId) return;

        const targetTask = tasks.find(t => t.id === targetId);
        const sourceTask = tasks.find(t => t.id === sourceId);
        if (!targetTask || !sourceTask) return;

        if (targetTask.projectId !== sourceTask.projectId) return;

        // The dependency type is derived from which handle started the drag and which ended it.
        let type: 'FS'|'SS'|'FF'|'SF' = 'FS';
        if (sourceType === 'end' && targetType === 'start') type = 'FS';
        if (sourceType === 'start' && targetType === 'start') type = 'SS';
        if (sourceType === 'end' && targetType === 'end') type = 'FF';
        if (sourceType === 'start' && targetType === 'end') type = 'SF';

        // For structural simplicity, the target task ALWAYS holds the dependency array pointing to the source task.
        const dependentId = targetId;
        const dependeeId = sourceId;

        /**
         * Determines, via breadth-first traversal of the dependency graph, whether the
         * start node already depends on the target node, which would indicate that adding
         * the new dependency would form a cycle.
         * @param startNodeId The node from which traversal begins.
         * @param targetNodeId The node whose presence in the chain indicates a cycle.
         * @returns True when a path from start to target exists.
         */
        const hasCircularDependency = (startNodeId: string, targetNodeId: string): boolean => {
            const visited = new Set<string>();
            const queue = [startNodeId];

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                if (currentId === targetNodeId) return true;

                if (!visited.has(currentId)) {
                    visited.add(currentId);
                    const currentTask = tasks.find(t => t.id === currentId);
                    if (currentTask && currentTask.dependsOn) {
                        for (const dep of currentTask.dependsOn) {
                            queue.push(dep.id);
                        }
                    }
                }
            }
            return false;
        };

        // The link is blocked when the dependee already depends on the dependent, since
        // that would create a cycle.
        if (hasCircularDependency(dependeeId, dependentId)) {
            console.warn("Circular dependency detected. Action blocked.");
            return;
        }

        const dependentTask = tasks.find(t => t.id === dependentId);
        if (!dependentTask) return;

        const currentDeps = dependentTask.dependsOn || [];

        if (!currentDeps.some(d => d.id === dependeeId)) {
            window.webviewApi.postMessage({ 
                name: 'updateTaskDependencies', 
                payload: { taskId: dependentId, dependsOn: [...currentDeps, { id: dependeeId, type }] } 
            });
        }
    };

    const firstTaskTime = timelineTasks.length > 0 ? Math.min(...timelineTasks.map(t => t.startDate || t.createdTime)) : now;
    const lastTaskTime = timelineTasks.length > 0 ? Math.max(...timelineTasks.map(t => t.dueDate || 0)) : now;

    /**
     * Recomputes the visible time range and container width from the current horizontal
     * scroll position of the timeline.
     */
    const handleScroll = () => {
        if (!wrapperRef.current) return;
        const wrapper = wrapperRef.current;
        const scrollLeft = wrapper.scrollLeft;
        const viewportWidth = wrapper.clientWidth;
        const scrollWidth = wrapper.scrollWidth;

        setContainerWidth(scrollWidth);

        const startPercent = scrollLeft / scrollWidth;
        const endPercent = (scrollLeft + viewportWidth) / scrollWidth;

        const visibleStartTime = startRange + (startPercent * viewDuration);
        const visibleEndTime = startRange + (endPercent * viewDuration);

        setVisibleRange({ start: visibleStartTime, end: visibleEndTime });
    };

    React.useEffect(() => {
        handleScroll();
        window.addEventListener('resize', handleScroll);
        return () => window.removeEventListener('resize', handleScroll);
    }, [viewDuration, startRange, zoomLevel]);

    /**
     * Reports whether a given time falls within the currently visible range, applying a
     * one-day buffer so jump controls disable slightly before the exact edge is reached.
     * @param time The timestamp to test.
     */
    const isTimeVisible = (time: number) => {
        const buffer = 24 * 60 * 60 * 1000;
        return time >= (visibleRange.start + buffer) && time <= (visibleRange.end - buffer);
    };

    /**
     * Changes the zoom level within its bounds while keeping the horizontal center point
     * of the view stable across the re-render.
     * @param direction The zoom direction, 'in' or 'out'.
     */
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

        // The scroll position is adjusted inside requestAnimationFrame so it runs after
        // React has re-rendered the timeline at the new width.
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

    /**
     * Derives a stable, theme-aware HSL color for a project. The hue is hashed from the
     * project ID to keep each project visually distinct, while saturation and lightness
     * are read from theme-driven CSS variables so the color adapts to the active theme.
     * @param projectId The project ID to map to a color.
     * @returns An HSL color string referencing the theme-aware saturation and lightness.
     */
    const getProjectColor = (projectId: string) => {
        let hash = 0;
        for (let i = 0; i < projectId.length; i++) {
            hash = projectId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const h = Math.abs(hash) % 360;
        return `hsl(${h}, var(--prj-bar-saturation, 60%), var(--prj-bar-lightness, 50%))`;
    };

    /**
     * Converts an absolute timestamp into its horizontal position as a percentage of the
     * visible timeline duration.
     * @param time The timestamp to position.
     * @returns The position as a percentage.
     */
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

    /**
     * Smoothly scrolls the timeline so that the first task, today, or the last task is
     * centered in the viewport.
     * @param target The point to scroll to.
     */
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
                        style={{ padding: '4px 10px', cursor: isTimeVisible(now) ? 'not-allowed' : 'pointer', background: 'var(--joplin-background-color)', color: isTimeVisible(now) ? 'var(--joplin-color)' : 'var(--prj-today)', border: '1px solid var(--joplin-divider-color)', borderRadius: '4px', fontWeight: 'bold', opacity: isTimeVisible(now) ? 0.5 : 1 }}
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

                <div className="timeline-body" ref={bodyRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', position: 'relative' }}>
                    <div style={{ position: 'relative', minHeight: '100%', padding: '20px 0', boxSizing: 'border-box' }}>
                    {/* SVG Layer for Dependency Lines */}
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
                        <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--joplin-color)" opacity="0.6" />
                            </marker>
                        </defs>
                        {timelineTasks.map((task, targetIndex) => {
                            if (!task.dependsOn || task.dependsOn.length === 0) return null;
                            return task.dependsOn.map(dep => {
                                const sourceIndex = timelineTasks.findIndex(t => t.id === dep.id);
                                if (sourceIndex === -1) return null;
                                
                                const sourceTask = timelineTasks[sourceIndex];
                                
                                // Determine line connection points based on dependency type
                                const isSourceEnd = dep.type === 'FS' || dep.type === 'FF';
                                const isTargetEnd = dep.type === 'SF' || dep.type === 'FF';

                                const sourceTime = isSourceEnd ? (sourceTask.dueDate || sourceTask.startDate || sourceTask.createdTime) : (sourceTask.startDate || sourceTask.createdTime);
                                const targetTime = isTargetEnd ? (task.dueDate || task.startDate || task.createdTime) : (task.startDate || task.createdTime);

                                const sourceX = (getPosition(sourceTime) / 100) * containerWidth;
                                const targetX = (getPosition(targetTime) / 100) * containerWidth;
                                
                                const sourceY = 20 + sourceIndex * 60 + 34; // 20px padding top + 60px per row + 34px to center of bar
                                const targetY = 20 + targetIndex * 60 + 34;

                                const sourceOffsetX = isSourceEnd ? 15 : -15;
                                const targetOffsetX = isTargetEnd ? 15 : -15;

                                // Orthogonal path logic needs to account for all 4 types to look neat.
                                let path = '';
                                if (dep.type === 'FS') {
                                    if (sourceX <= targetX) {
                                        path = `M ${sourceX} ${sourceY} L ${sourceX + 15} ${sourceY} L ${sourceX + 15} ${targetY} L ${targetX} ${targetY}`;
                                    } else {
                                        path = `M ${sourceX} ${sourceY} L ${sourceX + 15} ${sourceY} L ${sourceX + 15} ${sourceY + 30} L ${targetX - 15} ${sourceY + 30} L ${targetX - 15} ${targetY} L ${targetX} ${targetY}`;
                                    }
                                } else {
                                    // Generic fallback for other types (SS, FF, SF) - simplified routing
                                    path = `M ${sourceX} ${sourceY} L ${sourceX + sourceOffsetX} ${sourceY} L ${sourceX + sourceOffsetX} ${(sourceY+targetY)/2} L ${targetX + targetOffsetX} ${(sourceY+targetY)/2} L ${targetX + targetOffsetX} ${targetY} L ${targetX} ${targetY}`;
                                }

                                // Calculate midpoint for delete button
                                const midX = (sourceX + targetX) / 2;
                                const midY = (sourceY + targetY) / 2;

                                return (
                                    <g key={`${dep.id}-${task.id}`}>
                                        <path d={path} stroke="var(--joplin-color)" strokeWidth="2" fill="none" markerEnd="url(#arrow)" strokeDasharray="4 2" opacity={0.4} />
                                        <circle 
                                            cx={midX} 
                                            cy={midY} 
                                            r="8" 
                                            fill="var(--joplin-background-color)" 
                                            stroke="var(--joplin-divider-color)" 
                                            strokeWidth="1"
                                            style={{ cursor: 'pointer', pointerEvents: 'all' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const currentDeps = task.dependsOn || [];
                                                const newDeps = currentDeps.filter(d => d.id !== dep.id);
                                                window.webviewApi.postMessage({ 
                                                    name: 'updateTaskDependencies', 
                                                    payload: { taskId: task.id, dependsOn: newDeps } 
                                                });
                                            }}
                                        />
                                        <text x={midX} y={midY} fontSize="10" fill="var(--prj-danger)" textAnchor="middle" dominantBaseline="central" style={{ pointerEvents: 'none', fontWeight: 'bold' }}>✕</text>
                                    </g>
                                );
                            });
                        })}
                        {draggingDep && mousePos && (() => {
                            const sourceIndex = timelineTasks.findIndex(t => t.id === draggingDep.id);
                            if (sourceIndex === -1) return null;
                            const sourceTask = timelineTasks[sourceIndex];
                            
                            const sourceTime = draggingDep.type === 'end' 
                                ? (sourceTask.dueDate || sourceTask.startDate || sourceTask.createdTime)
                                : (sourceTask.startDate || sourceTask.createdTime);
                            
                            const sourceX = (getPosition(sourceTime) / 100) * containerWidth;
                            const sourceY = 20 + sourceIndex * 60 + 34;
                            
                            const directionX = draggingDep.type === 'end' ? 15 : -15;
                            const path = `M ${sourceX} ${sourceY} L ${sourceX + directionX} ${sourceY} L ${sourceX + directionX} ${mousePos.y} L ${mousePos.x} ${mousePos.y}`;
                            
                            return <path d={path} stroke="var(--joplin-color)" strokeWidth="2" fill="none" markerEnd="url(#arrow)" opacity={0.8} />;
                        })()}
                    </svg>

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

                    <div style={{ position: 'absolute', left: `${nowPos}%`, top: 0, bottom: 0, width: '2px', background: 'var(--prj-today)', zIndex: 10, pointerEvents: 'none' }}>
                        <div style={{ position: 'absolute', top: '5px', right: '6px', color: 'var(--prj-today)', fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>TODAY</div>
                        <div style={{ position: 'absolute', bottom: '5px', right: '6px', color: 'var(--prj-today)', fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>TODAY</div>
                    </div>

                    {timelineTasks.map((task, index) => {
                        const effectiveStart = tempTaskDates[task.id] ? tempTaskDates[task.id].start : (task.startDate || task.createdTime);
                        const effectiveDue = tempTaskDates[task.id] ? tempTaskDates[task.id].end : (task.dueDate || effectiveStart);
                        const startPos = getPosition(effectiveStart);
                        const endPos = getPosition(effectiveDue);
                        const width = Math.max(endPos - startPos, 0.5);
                        const projectColor = getProjectColor(task.projectId);
                        const isOverdue = effectiveDue > 0 && effectiveDue < Date.now() && task.status !== 'done';
                        const isApproaching = task.isApproaching && !isOverdue && task.status !== 'done';
                        
                        const isDroppableTarget = draggingDep && draggingDep.id !== task.id && draggingDep.projectId === task.projectId;

                        return (
                            <div key={task.id} className={`timeline-row ${isOverdue ? 'overdue' : ''} ${isApproaching ? 'approaching' : ''} ${isDroppableTarget ? 'droppable' : ''}`} 
                                 style={{ height: '60px', position: 'relative', borderBottom: '1px solid var(--joplin-divider-color)', margin: '0 10px', cursor: draggingDep ? 'copy' : 'pointer' }} 
                                 onDoubleClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                 onContextMenu={(e) => handleContextMenu(e, task)}
                                 title={`${task.projectName}\n${task.title}${task.startDate && task.startDate > 0 ? `\nStart: ${formatDate(task.startDate)}` : ''}${task.dueDate! > 0 ? `\n${isOverdue ? '(Overdue) ' : (isApproaching ? '(Approaching) ' : '')}Due: ${formatDate(task.dueDate!)}` : ''}`}>
                                <div style={{ position: 'absolute', left: `${startPos}%`, top: '5px', fontSize: '0.9rem', color: 'var(--joplin-color)', whiteSpace: 'nowrap', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: projectColor, display: 'inline-block', flexShrink: 0 }}></span>
                                    <span style={{ color: 'var(--prj-project-tag)' }}>[{task.projectName}]</span> {task.title}
                                </div>
                                <div className={`timeline-bar ${task.status === 'done' ? 'done' : ''}`} 
                                    onMouseDown={(e) => {
                                        if (e.button !== 0) return; // Only left click
                                        e.stopPropagation(); 
                                        e.preventDefault();
                                        if (bodyRef.current) {
                                            const rect = bodyRef.current.getBoundingClientRect();
                                            const currentX = e.clientX - rect.left + bodyRef.current.scrollLeft;
                                            setDraggingTask({ 
                                                id: task.id, 
                                                initialX: currentX, 
                                                initialStart: task.startDate || task.createdTime, 
                                                initialDue: task.dueDate || task.startDate || task.createdTime,
                                                type: 'move'
                                            });
                                        }
                                    }}
                                    style={{ 
                                    position: 'absolute', 
                                    left: `${startPos}%`, 
                                    width: `${width}%`, 
                                    height: '8px', 
                                    top: '30px', 
                                    background: task.status === 'done' ? 'var(--joplin-divider-color)' : projectColor, 
                                    borderRadius: '4px', 
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
                                    opacity: task.status === 'done' ? 0.5 : 1,
                                    cursor: 'ew-resize'
                                }}>
                                    {/* Invisible Resize Area Left */}
                                    <div 
                                        style={{ position: 'absolute', left: 0, top: '-5px', width: '8px', height: '18px', cursor: 'col-resize', zIndex: 12 }}
                                        onMouseDown={(e) => {
                                            if (e.button !== 0) return;
                                            e.stopPropagation(); 
                                            e.preventDefault();
                                            if (bodyRef.current) {
                                                const rect = bodyRef.current.getBoundingClientRect();
                                                const currentX = e.clientX - rect.left + bodyRef.current.scrollLeft;
                                                setDraggingTask({ 
                                                    id: task.id, 
                                                    initialX: currentX, 
                                                    initialStart: task.startDate || task.createdTime, 
                                                    initialDue: task.dueDate || task.startDate || task.createdTime,
                                                    type: 'resizeStart'
                                                });
                                            }
                                        }}
                                    />
                                    {/* Invisible Resize Area Right */}
                                    <div 
                                        style={{ position: 'absolute', right: 0, top: '-5px', width: '8px', height: '18px', cursor: 'col-resize', zIndex: 12 }}
                                        onMouseDown={(e) => {
                                            if (e.button !== 0) return;
                                            e.stopPropagation(); 
                                            e.preventDefault();
                                            if (bodyRef.current) {
                                                const rect = bodyRef.current.getBoundingClientRect();
                                                const currentX = e.clientX - rect.left + bodyRef.current.scrollLeft;
                                                setDraggingTask({ 
                                                    id: task.id, 
                                                    initialX: currentX, 
                                                    initialStart: task.startDate || task.createdTime, 
                                                    initialDue: task.dueDate || task.startDate || task.createdTime,
                                                    type: 'resizeEnd'
                                                });
                                            }
                                        }}
                                    />
                                    {/* Start Handle */}
                                    <div 
                                        style={{ position: 'absolute', left: '-6px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--joplin-background-color)', border: `2px solid ${projectColor}`, cursor: 'crosshair', zIndex: 11, opacity: 1, transition: 'transform 0.2s', transformOrigin: 'center' }}
                                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDraggingDep({id: task.id, type: 'start', projectId: task.projectId}); }}
                                        onMouseUp={(e) => {
                                            if (draggingDep && draggingDep.id !== task.id) {
                                                e.stopPropagation();
                                                handleCreateDependency(draggingDep.id, draggingDep.type, task.id, 'start');
                                            }
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1.3)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
                                        title={draggingDep ? "Drop to connect to Start" : "Drag from Start to create dependency"}
                                        className="dep-handle start-handle"
                                    />
                                    {/* End Handle */}
                                    <div 
                                        style={{ position: 'absolute', right: '-6px', top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--joplin-background-color)', border: `2px solid ${projectColor}`, cursor: 'crosshair', zIndex: 11, opacity: 1, transition: 'transform 0.2s', transformOrigin: 'center' }}
                                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setDraggingDep({id: task.id, type: 'end', projectId: task.projectId}); }}
                                        onMouseUp={(e) => {
                                            if (draggingDep && draggingDep.id !== task.id) {
                                                e.stopPropagation();
                                                handleCreateDependency(draggingDep.id, draggingDep.type, task.id, 'end');
                                            }
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1.3)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
                                        title={draggingDep ? "Drop to connect to End" : "Drag from End to create dependency"}
                                        className="dep-handle end-handle"
                                    />
                                </div>
                                <div style={{ 
                                    position: 'absolute', 
                                    left: `${startPos}%`, 
                                    top: '42px', 
                                    fontSize: '0.65rem', 
                                    opacity: 0.5,
                                    whiteSpace: 'nowrap',
                                    display: width < 15 ? 'none' : 'block'
                                }}>{formatDate(effectiveStart, false)}</div>
                                <div style={{ 
                                    position: 'absolute', 
                                    left: width < 15 ? `${startPos}%` : `${endPos}%`, 
                                    top: '42px', 
                                    fontSize: '0.65rem', 
                                    transform: width < 15 ? 'none' : 'translateX(-100%)', 
                                    opacity: (isOverdue || isApproaching) ? 1 : 0.5, 
                                    color: isOverdue ? 'var(--prj-overdue)' : (isApproaching ? 'var(--prj-approaching)' : 'inherit'),
                                    fontWeight: (isOverdue || isApproaching) ? 'bold' : 'normal',
                                    textAlign: width < 15 ? 'left' : 'right',
                                    whiteSpace: 'nowrap'
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