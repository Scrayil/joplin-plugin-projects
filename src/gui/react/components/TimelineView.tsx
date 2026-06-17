import * as React from 'react';
import { Task } from '../types';
import {formatDate} from "../utils";
import TaskContextMenu from './TaskContextMenu';

interface TimelineViewProps {
    tasks: Task[];
    sortOption: string;
    sortApplyToken: number;
    onOpenNote: (taskId: string) => void;
    onEditTask: (task: Task) => void;
    onUpdateDependencies: (taskId: string, dependsOn: { id: string, type: 'FS'|'SS'|'FF'|'SF' }[]) => void;
}

/**
 * Renders a Gantt-like timeline view of tasks based on their creation and due dates.
 */
const TimelineView: React.FC<TimelineViewProps> = ({ tasks, sortOption, sortApplyToken, onOpenNote, onEditTask, onUpdateDependencies }) => {
    const [contextMenu, setContextMenu] = React.useState<{x: number, y: number, task: Task} | null>(null);
    const [zoomLevel, setZoomLevel] = React.useState<number>(1); // 1 = Month, 2 = Week, 3 = Day
    const [visibleRange, setVisibleRange] = React.useState<{start: number, end: number}>({start: 0, end: 0});
    const [containerWidth, setContainerWidth] = React.useState<number>(800);
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const bodyRef = React.useRef<HTMLDivElement>(null);
    // Tracks whether the initial centering on today has run for this mount, so the timeline
    // opens centered on the current day the first time it gains a real width (e.g. when the
    // tab is first shown) without overriding the user's scroll afterwards.
    const hasCenteredOnToday = React.useRef(false);
    // Set when a bar drag ends so the synthetic click that follows does not also scroll the
    // row to its task; reset by the next row interaction.
    const suppressRowClickRef = React.useRef(false);

    const [draggingDep, setDraggingDep] = React.useState<{id: string, type: 'start'|'end', projectId: string} | null>(null);
    const [mousePos, setMousePos] = React.useState<{x: number, y: number} | null>(null);

    // States for Task Bar Drag & Drop (Scheduling)
    const [draggingTask, setDraggingTask] = React.useState<{ id: string, initialX: number, initialStart: number, initialDue: number, type: 'move' | 'resizeStart' | 'resizeEnd' } | null>(null);
    const [tempTaskDates, setTempTaskDates] = React.useState<Record<string, { start: number, end: number }>>({});

    // When the user manually edits dates, the row order is frozen to the snapshot below so
    // the timeline does not reshuffle mid-editing. It resumes following the global sort when
    // the sort option is re-applied or the view is remounted (tab change).
    const [frozenOrder, setFrozenOrder] = React.useState<string[] | null>(null);

    const [showCriticalPath, setShowCriticalPath] = React.useState(false);

    // Time calculations live at component scope so the scroll listener and effects can reuse them.
    const now = Date.now();
    // Rows follow the global sort (the incoming task order) unless a manual edit has frozen
    // the order, in which case the frozen snapshot is honored and any newly added tasks are
    // appended; removed tasks are dropped.
    const timelineTasks = React.useMemo(() => {
        const filtered = tasks.filter(t => t.dueDate && t.dueDate > 0 && t.status !== 'done');
        const incomingIds = filtered.map(t => t.id);
        let orderedIds = incomingIds;
        if (frozenOrder) {
            const present = new Set(incomingIds);
            orderedIds = [
                ...frozenOrder.filter(id => present.has(id)),
                ...incomingIds.filter(id => !frozenOrder.includes(id))
            ];
        }
        const byId = new Map(filtered.map(t => [t.id, t]));
        return orderedIds.map(id => byId.get(id)).filter(Boolean) as Task[];
    }, [tasks, frozenOrder]);

    // The latest rendered row order, captured so a manual edit can freeze it instantly.
    const rowOrderRef = React.useRef<string[]>([]);
    rowOrderRef.current = timelineTasks.map(t => t.id);

    // Re-applying the global sort (selecting a new option or re-using the sort control)
    // resumes automatic ordering.
    React.useEffect(() => { setFrozenOrder(null); }, [sortOption, sortApplyToken]);

    // The set of tasks on the critical path: per project, the longest chain of linked tasks
    // by cumulative duration, i.e. the sequence that determines the project's end date.
    const criticalIds = React.useMemo(() => {
        const result = new Set<string>();
        if (timelineTasks.length === 0) return result;

        const byId = new Map(timelineTasks.map(t => [t.id, t]));
        const durationOf = (t: Task) => {
            const start = t.startDate || t.createdTime;
            const due = t.dueDate || start;
            return Math.max(0, due - start);
        };

        // Longest cumulative duration of the dependency chain ending at each task.
        const chainLength = new Map<string, number>();
        const visiting = new Set<string>();
        const computeChain = (id: string): number => {
            if (chainLength.has(id)) return chainLength.get(id)!;
            if (visiting.has(id)) return 0;
            const task = byId.get(id);
            if (!task) return 0;
            visiting.add(id);
            let longestPredecessor = 0;
            for (const dep of (task.dependsOn || [])) {
                if (byId.has(dep.id)) longestPredecessor = Math.max(longestPredecessor, computeChain(dep.id));
            }
            visiting.delete(id);
            const total = longestPredecessor + durationOf(task);
            chainLength.set(id, total);
            return total;
        };
        timelineTasks.forEach(t => computeChain(t.id));

        const byProject = new Map<string, Task[]>();
        timelineTasks.forEach(t => {
            const group = byProject.get(t.projectId) || [];
            group.push(t);
            byProject.set(t.projectId, group);
        });

        byProject.forEach(group => {
            const hasLinks = group.some(t => (t.dependsOn || []).some(d => byId.has(d.id)));
            if (!hasLinks) return;
            let endTask: Task | null = null;
            let maxLength = -1;
            for (const t of group) {
                const len = chainLength.get(t.id) || 0;
                if (len > maxLength) { maxLength = len; endTask = t; }
            }
            let current = endTask;
            const guard = new Set<string>();
            while (current && !guard.has(current.id)) {
                guard.add(current.id);
                result.add(current.id);
                let nextDep: Task | null = null;
                let nextLength = -1;
                for (const dep of (current.dependsOn || [])) {
                    const depTask = byId.get(dep.id);
                    if (depTask) {
                        const len = chainLength.get(depTask.id) || 0;
                        if (len > nextLength) { nextLength = len; nextDep = depTask; }
                    }
                }
                current = nextDep;
            }
        });

        return result;
    }, [timelineTasks]);

    const minTime = timelineTasks.length > 0 ? Math.min(...timelineTasks.map(t => t.startDate || t.createdTime), now) : now;
    const maxTime = timelineTasks.length > 0 ? Math.max(...timelineTasks.map(t => t.dueDate || 0), now) : now;
    
    const twoMonthsMs = 60 * 24 * 60 * 60 * 1000;
    const startRange = minTime - twoMonthsMs;
    const endRange = maxTime + twoMonthsMs;
    const viewDuration = endRange - startRange;

    React.useEffect(() => {
        if (!draggingTask) return;

        const onMove = (e: MouseEvent) => {
            if (bodyRef.current && draggingTask) {
                const rect = bodyRef.current.getBoundingClientRect();
                const currentX = e.clientX - rect.left + bodyRef.current.scrollLeft;
                setMousePos({ x: currentX, y: e.clientY - rect.top + bodyRef.current.scrollTop });

                const deltaX = currentX - draggingTask.initialX;
                const containerW = containerWidth || 800;
                const timePerPixel = viewDuration / containerW;
                const dayMs = 24 * 60 * 60 * 1000;
                // The movement is snapped to whole-day increments for clean scheduling,
                // preserving each timestamp's time-of-day.
                const deltaTime = Math.round((deltaX * timePerPixel) / dayMs) * dayMs;

                let newStart = draggingTask.initialStart;
                let newEnd = draggingTask.initialDue;

                if (draggingTask.type === 'move') {
                    newStart += deltaTime;
                    newEnd += deltaTime;
                } else if (draggingTask.type === 'resizeStart') {
                    newStart = Math.min(draggingTask.initialStart + deltaTime, newEnd - dayMs);
                } else if (draggingTask.type === 'resizeEnd') {
                    newEnd = Math.max(draggingTask.initialDue + deltaTime, newStart + dayMs);
                }

                setTempTaskDates(prev => ({
                    ...prev,
                    [draggingTask.id]: { start: newStart, end: newEnd }
                }));
            }
        };
        const onUp = () => {
            if (draggingTask) {
                suppressRowClickRef.current = true;
                const draggedId = draggingTask.id;
                const tempDates = tempTaskDates[draggedId];
                if (tempDates) {
                    const updatedTask = tasks.find(t => t.id === draggedId);
                    if (updatedTask) {
                         window.webviewApi.postMessage({
                             name: 'updateTaskDates',
                             payload: {
                                 taskId: draggedId,
                                 startDate: tempDates.start,
                                 dueDate: tempDates.end,
                                 subTasks: updatedTask.subTasks,
                                 urgency: updatedTask.tags.find(t => ['high','medium','low'].includes(t.toLowerCase())) || 'medium'
                             }
                         });
                    }
                    // Freeze the current row order so the date change does not reshuffle rows.
                    setFrozenOrder(rowOrderRef.current.slice());
                }
                // The optimistic dates are kept until the refreshed data catches up
                // (cleared by the reconciliation effect below), preventing the bar from
                // snapping back to its old position during the backend round-trip. The
                // timeout is only a safety net should the update never round-trip.
                setDraggingTask(null);
                setTimeout(() => {
                    setTempTaskDates(prev => {
                        if (!(draggedId in prev)) return prev;
                        const next = { ...prev };
                        delete next[draggedId];
                        return next;
                    });
                }, 8000);
            }
            setMousePos(null);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [draggingTask, containerWidth, viewDuration, tempTaskDates, tasks]);

    React.useEffect(() => {
        if (draggingTask) return;
        setTempTaskDates(prev => {
            const ids = Object.keys(prev);
            if (ids.length === 0) return prev;
            let changed = false;
            const next = { ...prev };
            for (const id of ids) {
                const task = tasks.find(t => t.id === id);
                if (!task) {
                    delete next[id];
                    changed = true;
                    continue;
                }
                const realStart = task.startDate || task.createdTime;
                const realDue = task.dueDate || realStart;
                if (Math.abs(realStart - next[id].start) <= 1000 && Math.abs(realDue - next[id].end) <= 1000) {
                    delete next[id];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [tasks, draggingTask]);

    /**
     * Begins a dependency drag from a task handle. Window listeners are attached
     * synchronously so the in-progress connector follows the cursor immediately and any
     * release reliably ends the gesture: releasing over a target handle creates the link
     * (that handle's onMouseUp runs first), while releasing anywhere else simply cancels.
     * Either way the connector line is cleared, never left floating.
     * @param id The source task ID.
     * @param type The source handle, 'start' or 'end'.
     * @param projectId The source task's project, used to validate drop targets.
     */
    const startDependencyDrag = (id: string, type: 'start'|'end', projectId: string) => {
        setDraggingDep({ id, type, projectId });
        const onMove = (e: MouseEvent) => {
            if (!bodyRef.current) return;
            const rect = bodyRef.current.getBoundingClientRect();
            setMousePos({
                x: e.clientX - rect.left + bodyRef.current.scrollLeft,
                y: e.clientY - rect.top + bodyRef.current.scrollTop
            });
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            setDraggingDep(null);
            setMousePos(null);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

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

        if (targetTask.projectId !== sourceTask.projectId) {
            window.webviewApi.postMessage({
                name: 'showToast',
                payload: { message: 'Dependencies can only link tasks within the same project.', type: 'error' }
            });
            return;
        }

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
            window.webviewApi.postMessage({
                name: 'showToast',
                payload: { message: 'Cannot link these tasks: it would create a circular dependency.', type: 'error' }
            });
            return;
        }

        const dependentTask = tasks.find(t => t.id === dependentId);
        if (!dependentTask) return;

        const currentDeps = dependentTask.dependsOn || [];

        if (currentDeps.some(d => d.id === dependeeId)) return;

        // A dependency that the current schedule already violates is rejected so the
        // timeline never enters an inconsistent state; the user adjusts the dates first.
        if (isDependencyViolated(targetTask, sourceTask, type)) {
            const labels: Record<typeof type, string> = {
                FS: 'must start after', SS: 'must start no earlier than the start of',
                FF: 'must finish no earlier than', SF: 'must finish no earlier than the start of'
            };
            window.webviewApi.postMessage({
                name: 'showToast',
                payload: { message: `Cannot create this ${type} dependency: "${targetTask.title}" ${labels[type]} "${sourceTask.title}". Adjust the dates first.`, type: 'error' }
            });
            return;
        }

        onUpdateDependencies(dependentId, [...currentDeps, { id: dependeeId, type }]);
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
        /**
         * Centers the timeline on today the first time it has a real width, so a freshly
         * opened timeline starts on the current day; later size changes leave the user's
         * scroll untouched.
         */
        const centerOnTodayOnce = () => {
            if (hasCenteredOnToday.current) return;
            if (!wrapperRef.current || wrapperRef.current.clientWidth === 0) return;
            handleJumpTo('today', 'auto');
            hasCenteredOnToday.current = true;
        };

        const measure = () => { handleScroll(); centerOnTodayOnce(); };

        measure();
        window.addEventListener('resize', measure);
        // A ResizeObserver re-measures when the wrapper gains a real size again, which happens
        // when the tab becomes visible after being hidden or when the panel is resized; the
        // mount-time measurement is 0 while the view is hidden.
        let observer: ResizeObserver | null = null;
        if (wrapperRef.current && typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(() => measure());
            observer.observe(wrapperRef.current);
        }
        return () => {
            window.removeEventListener('resize', measure);
            if (observer) observer.disconnect();
        };
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

    /**
     * Computes a task's completion ratio from its subtasks, returning 0 when the task
     * has no subtasks.
     * @param task The task to evaluate.
     * @returns A value between 0 and 1.
     */
    const getTaskProgress = (task: Task): number => {
        if (!task.subTasks || task.subTasks.length === 0) return 0;
        const completed = task.subTasks.filter(st => st.completed).length;
        return completed / task.subTasks.length;
    };

    /**
     * Reports whether a dependency is violated by the current schedule, i.e. the dependent
     * task is scheduled earlier than the dependency type permits relative to its predecessor.
     * @param target The dependent task (the one that holds the dependency).
     * @param source The predecessor task it depends on.
     * @param type The dependency type.
     */
    const isDependencyViolated = (target: Task, source: Task, type: 'FS'|'SS'|'FF'|'SF'): boolean => {
        const targetStart = target.startDate || target.createdTime;
        const targetDue = target.dueDate || targetStart;
        const sourceStart = source.startDate || source.createdTime;
        const sourceDue = source.dueDate || sourceStart;
        switch (type) {
            case 'FS': return targetStart < sourceDue;
            case 'SS': return targetStart < sourceStart;
            case 'FF': return targetDue < sourceDue;
            case 'SF': return targetDue < sourceStart;
            default: return false;
        }
    };
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
    const handleJumpTo = (target: 'start' | 'today' | 'end', behavior: ScrollBehavior = 'smooth') => {
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
            behavior: behavior
        });
    };

    /**
     * Smoothly scrolls the timeline so the given task's bar is centered in the viewport,
     * which brings into view tasks whose bars sit off-screen, such as overdue tasks that
     * fall before the current day.
     * @param task The task to bring into view.
     */
    const scrollToTask = (task: Task) => {
        if (!wrapperRef.current) return;
        const wrapper = wrapperRef.current;
        const viewportWidth = wrapper.clientWidth;
        const scrollWidth = wrapper.scrollWidth;

        const start = tempTaskDates[task.id] ? tempTaskDates[task.id].start : (task.startDate || task.createdTime);
        const due = tempTaskDates[task.id] ? tempTaskDates[task.id].end : (task.dueDate || start);
        const midpoint = start + (due - start) / 2;
        const targetPercent = (midpoint - startRange) / viewDuration;
        const targetScrollLeft = (targetPercent * scrollWidth) - (viewportWidth / 2);

        wrapper.scrollTo({
            left: Math.max(0, Math.min(targetScrollLeft, scrollWidth - viewportWidth)),
            behavior: 'smooth'
        });
    };

    /**
     * Renders a circular dependency handle for a task. Pressing it starts a dependency
     * drag from the given side; releasing another task's drag over it creates the link.
     * @param task The task the handle belongs to.
     * @param side The edge the handle represents.
     * @param color The handle color (the task's project color).
     * @param position The handle's horizontal placement within its container.
     */
    const renderDependencyHandle = (task: Task, side: 'start' | 'end', color: string, position: React.CSSProperties) => (
        <div
            style={{ position: 'absolute', ...position, top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', borderRadius: '50%', background: color, border: '2px solid var(--joplin-background-color)', boxShadow: `0 0 0 1.5px ${color}`, cursor: 'crosshair', zIndex: 13, transition: 'transform 0.2s, opacity 0.15s', transformOrigin: 'center' }}
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); startDependencyDrag(task.id, side, task.projectId); }}
            onMouseUp={() => { if (draggingDep && draggingDep.id !== task.id) handleCreateDependency(draggingDep.id, draggingDep.type, task.id, side); }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1.3)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
            title={draggingDep ? `Drop to connect to ${side === 'start' ? 'Start' : 'End'}` : `Drag from ${side === 'start' ? 'Start' : 'End'} to create dependency`}
            className={`dep-handle ${side}-handle`}
        />
    );

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
                        onClick={() => setShowCriticalPath(v => !v)}
                        title="Highlight the critical path (longest chain of linked tasks per project)"
                        style={{ padding: '4px 10px', cursor: 'pointer', background: showCriticalPath ? 'var(--prj-critical)' : 'var(--joplin-background-color)', color: showCriticalPath ? '#fff' : 'var(--joplin-color)', border: `1px solid ${showCriticalPath ? 'var(--prj-critical)' : 'var(--joplin-divider-color)'}`, borderRadius: '4px', fontWeight: showCriticalPath ? 'bold' : 'normal' }}
                    >
                        ⬩ Critical Path
                    </button>
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

                <div className={`timeline-body ${draggingDep ? 'linking' : ''}`} ref={bodyRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', width: '100%', position: 'relative' }}>
                    <div style={{ position: 'relative', minHeight: '100%', padding: '20px 0', boxSizing: 'border-box' }}>
                    {/* SVG Layer for Dependency Lines */}
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
                        <defs>
                            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--joplin-color)" opacity="0.6" />
                            </marker>
                            <marker id="arrow-critical" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--prj-critical)" />
                            </marker>
                            <marker id="arrow-conflict" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--prj-overdue)" />
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
                                
                                const sourceY = 20 + sourceIndex * 60 + 39; // 20px top padding + 60px per row + 39px to the bar center
                                const targetY = 20 + targetIndex * 60 + 39;

                                const stub = 14;
                                const exitX = sourceX + (isSourceEnd ? stub : -stub);
                                const entryX = targetX + (isTargetEnd ? stub : -stub);

                                // Orthogonal routing shared by all four dependency types: the line
                                // exits the source horizontally on its connected side and enters the
                                // target horizontally on its connected side, so the arrowhead always
                                // aligns with the linked edge. A direct two-bend route is used when it
                                // does not backtrack; otherwise a mid-row detour keeps the segments clean.
                                const entersFromLeft = !isTargetEnd;
                                const directRoute = entersFromLeft ? exitX <= targetX : exitX >= targetX;
                                let path = '';
                                // The delete handle is placed on an actual segment of the path (the
                                // mid of the vertical leg, or of the detour's middle leg) so it stays
                                // attached to the connector rather than floating at the bbox center.
                                let midX = 0;
                                let midY = 0;
                                if (directRoute) {
                                    path = `M ${sourceX} ${sourceY} L ${exitX} ${sourceY} L ${exitX} ${targetY} L ${targetX} ${targetY}`;
                                    midX = exitX;
                                    midY = (sourceY + targetY) / 2;
                                } else {
                                    const detourY = targetY >= sourceY ? sourceY + 30 : sourceY - 30;
                                    path = `M ${sourceX} ${sourceY} L ${exitX} ${sourceY} L ${exitX} ${detourY} L ${entryX} ${detourY} L ${entryX} ${targetY} L ${targetX} ${targetY}`;
                                    midX = (exitX + entryX) / 2;
                                    midY = detourY;
                                }

                                const isCriticalLink = showCriticalPath && criticalIds.has(task.id) && criticalIds.has(dep.id);
                                const violated = isDependencyViolated(task, sourceTask, dep.type);

                                // A scheduling conflict (red) takes visual priority over the critical
                                // path (violet); otherwise the dependency uses the subtle default style.
                                const linkStroke = violated ? 'var(--prj-overdue)' : (isCriticalLink ? 'var(--prj-critical)' : 'var(--joplin-color)');
                                const linkMarker = violated ? 'url(#arrow-conflict)' : (isCriticalLink ? 'url(#arrow-critical)' : 'url(#arrow)');
                                const linkSolid = violated || isCriticalLink;

                                return (
                                    <g key={`${dep.id}-${task.id}`}>
                                        <path d={path} stroke={linkStroke} strokeWidth={linkSolid ? 2.5 : 2} fill="none" markerEnd={linkMarker} strokeDasharray={linkSolid ? undefined : '4 2'} opacity={linkSolid ? 0.95 : 0.4} />
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
                                                onUpdateDependencies(task.id, newDeps);
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
                            const sourceY = 20 + sourceIndex * 60 + 39;
                            
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
                        const progress = getTaskProgress(task);
                        const isCritical = showCriticalPath && criticalIds.has(task.id);
                        // A zero-duration task (start equals due) is rendered as a milestone diamond.
                        const isMilestone = effectiveDue - effectiveStart <= 0;

                        return (
                            <div key={task.id} className={`timeline-row ${isOverdue ? 'overdue' : ''} ${isApproaching ? 'approaching' : ''} ${isDroppableTarget ? 'droppable' : ''}`}
                                 style={{ height: '60px', position: 'relative', borderBottom: '1px solid var(--joplin-divider-color)', margin: '0 10px', cursor: draggingDep ? 'copy' : 'pointer' }}
                                 onMouseDown={() => { suppressRowClickRef.current = false; }}
                                 onClick={(e) => {
                                     // Skip the synthetic click that follows a bar drag, the second click of a
                                     // double-click (which edits), and clicks on dependency handles.
                                     if (suppressRowClickRef.current) { suppressRowClickRef.current = false; return; }
                                     if (e.detail > 1) return;
                                     if ((e.target as HTMLElement).closest('.dep-handle')) return;
                                     scrollToTask(task);
                                 }}
                                 onDoubleClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                 onContextMenu={(e) => handleContextMenu(e, task)}
                                 title={`${task.projectName}\n${task.title}${task.startDate && task.startDate > 0 ? `\nStart: ${formatDate(task.startDate)}` : ''}${task.dueDate! > 0 ? `\n${isOverdue ? '(Overdue) ' : (isApproaching ? '(Approaching) ' : '')}Due: ${formatDate(task.dueDate!)}` : ''}`}>
                                <div style={{ position: 'absolute', left: `${startPos}%`, top: '5px', fontSize: '0.9rem', color: 'var(--joplin-color)', whiteSpace: 'nowrap', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: projectColor, display: 'inline-block', flexShrink: 0 }}></span>
                                    <span style={{ color: 'var(--prj-project-tag)' }}>[{task.projectName}]</span> {task.title}
                                </div>
                                {isMilestone && (
                                    <div
                                        onMouseDown={(e) => {
                                            if (e.button !== 0) return;
                                            e.stopPropagation();
                                            e.preventDefault();
                                            if (bodyRef.current) {
                                                const rect = bodyRef.current.getBoundingClientRect();
                                                const currentX = e.clientX - rect.left + bodyRef.current.scrollLeft;
                                                setDraggingTask({ id: task.id, initialX: currentX, initialStart: task.startDate || task.createdTime, initialDue: task.dueDate || task.startDate || task.createdTime, type: 'move' });
                                            }
                                        }}
                                        title={`${task.projectName}\n${task.title} (Milestone)`}
                                        style={{ position: 'absolute', left: `${startPos}%`, top: '28px', width: '22px', height: '22px', transform: 'translateX(-50%)', cursor: 'grab', zIndex: 2 }}
                                    >
                                        <div style={{ position: 'absolute', inset: '3px', background: task.status === 'done' ? 'var(--joplin-divider-color)' : projectColor, transform: 'rotate(45deg)', border: '1px solid var(--joplin-background-color)', boxShadow: isCritical ? '0 0 0 2.5px var(--prj-critical)' : '0 1px 3px rgba(0,0,0,0.3)', opacity: task.status === 'done' ? 0.5 : 1, pointerEvents: 'none' }} />
                                        {renderDependencyHandle(task, 'start', projectColor, { left: '-13px' })}
                                        {renderDependencyHandle(task, 'end', projectColor, { right: '-13px' })}
                                    </div>
                                )}
                                {!isMilestone && (
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
                                    height: '22px',
                                    top: '28px',
                                    background: `color-mix(in srgb, ${projectColor} 35%, transparent)`,
                                    border: `1px solid ${projectColor}`,
                                    boxSizing: 'border-box',
                                    borderRadius: '5px',
                                    boxShadow: isCritical ? '0 0 0 2.5px var(--prj-critical), 0 1px 4px rgba(0,0,0,0.25)' : '0 1px 3px rgba(0,0,0,0.15)',
                                    opacity: task.status === 'done' ? 0.5 : 1,
                                    cursor: 'grab',
                                    transition: (draggingTask && draggingTask.id === task.id) ? 'none' : 'left 0.18s ease, width 0.18s ease'
                                }}>
                                    {/* Progress fill (share of completed subtasks) */}
                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, background: projectColor, borderRadius: '4px 0 0 4px', pointerEvents: 'none', zIndex: 0 }} />
                                    {progress > 0 && (
                                        <span style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', fontWeight: 700, color: 'var(--joplin-color)', opacity: 0.7, pointerEvents: 'none', zIndex: 1 }}>{Math.round(progress * 100)}%</span>
                                    )}
                                    {/* Invisible Resize Area Left */}
                                    <div
                                        style={{ position: 'absolute', left: 0, top: '-3px', width: '10px', height: '28px', cursor: 'col-resize', zIndex: 12 }}
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
                                        style={{ position: 'absolute', right: 0, top: '-3px', width: '10px', height: '28px', cursor: 'col-resize', zIndex: 12 }}
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
                                    {renderDependencyHandle(task, 'start', projectColor, { left: '-15px' })}
                                    {renderDependencyHandle(task, 'end', projectColor, { right: '-15px' })}
                                </div>
                                )}
                                <div style={{ 
                                    position: 'absolute', 
                                    left: `${startPos}%`, 
                                    top: '52px',
                                    fontSize: '0.65rem', 
                                    opacity: 0.5,
                                    whiteSpace: 'nowrap',
                                    display: width < 15 ? 'none' : 'block'
                                }}>{formatDate(effectiveStart, false)}</div>
                                <div style={{ 
                                    position: 'absolute', 
                                    left: width < 15 ? `${startPos}%` : `${endPos}%`, 
                                    top: '52px',
                                    fontSize: '0.65rem', 
                                    transform: width < 15 ? 'none' : 'translateX(-100%)', 
                                    opacity: (isOverdue || isApproaching) ? 1 : 0.5, 
                                    color: isOverdue ? 'var(--prj-overdue)' : (isApproaching ? 'var(--prj-approaching)' : 'inherit'),
                                    fontWeight: (isOverdue || isApproaching) ? 'bold' : 'normal',
                                    textAlign: width < 15 ? 'left' : 'right',
                                    whiteSpace: 'nowrap'
                                }}>{formatDate(effectiveDue, false)}</div>
                            </div>
                        );
                    })}

                    {draggingTask && mousePos && tempTaskDates[draggingTask.id] && (
                        <div style={{
                            position: 'absolute',
                            left: mousePos.x,
                            top: mousePos.y,
                            transform: 'translate(14px, -130%)',
                            background: 'var(--joplin-background-color)',
                            color: 'var(--joplin-color)',
                            border: '1px solid var(--joplin-divider-color)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.72rem',
                            lineHeight: 1.45,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                            pointerEvents: 'none',
                            zIndex: 50
                        }}>
                            <div><strong>Start:</strong> {formatDate(tempTaskDates[draggingTask.id].start, false)}</div>
                            <div><strong>Due:</strong> {formatDate(tempTaskDates[draggingTask.id].end, false)}</div>
                        </div>
                    )}
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