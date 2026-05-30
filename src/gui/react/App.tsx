import * as React from 'react';
import { useState, useEffect } from 'react';
import { Task, DashboardData } from './types';
import KanbanBoard from './components/KanbanBoard';
import TimelineView from './components/TimelineView';
import ListView from './components/ListView';
import InfoView from './components/InfoView';
import WikiView from './components/WikiView';
import { getPriorityValue } from './utils';

/**
 * Main application component for the Task Dashboard.
 * Manages state, data fetching, and tab switching.
 */
const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'kanban' | 'timeline' | 'table' | 'wiki' | 'info'>('kanban');
    const [data, setData] = useState<DashboardData>({ projects: [], tasks: [] });
    const [loading, setLoading] = useState(true);
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [sortOption, setSortOption] = useState<string>('dueDate');
    const [showUrgentOnly, setShowUrgentOnly] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(Date.now());
    const isFetching = React.useRef(false);
    const isDialogOpen = React.useRef(false);

    /**
     * Fetches fresh dashboard data from the plugin backend.
     */
    const fetchData = React.useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        try {
            const response = await window.webviewApi.postMessage({ name: 'getData' });
            setData(response);
            setLastUpdated(Date.now());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, []);

    useEffect(() => {
        /**
         * Detects the active Joplin theme from the editor text color and applies the
         * matching color scheme and theme classes to the document.
         */
        const updateTheme = () => {
            const textColor = getComputedStyle(document.body).getPropertyValue('--joplin-color').trim();
            let isDarkTheme = false;
            
            let r=0, g=0, b=0;
            if (textColor.startsWith('#')) {
                const hex = textColor.substring(1);
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                b = parseInt(hex.substring(4, 6), 16);
            } else if (textColor.startsWith('rgb')) {
                const parts = textColor.match(/\d+/g);
                if (parts && parts.length >= 3) {
                    r = parseInt(parts[0]);
                    g = parseInt(parts[1]);
                    b = parseInt(parts[2]);
                }
            }
            
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            // Bright editor text indicates a dark theme.
            if (brightness > 128) isDarkTheme = true;

            document.documentElement.style.colorScheme = isDarkTheme ? 'dark' : 'light';
            document.documentElement.style.setProperty('accent-color', 'var(--joplin-selected-color)');
            
            if (isDarkTheme) {
                document.body.classList.add('theme-dark');
                document.body.classList.remove('theme-light');
            } else {
                document.body.classList.add('theme-light');
                document.body.classList.remove('theme-dark');
            }
        };

        updateTheme();
        fetchData();

        if (window.webviewApi && window.webviewApi.onMessage) {
            window.webviewApi.onMessage((message: any) => {
                if (message.name === 'dataChanged') {
                    fetchData();
                    updateTheme();
                }
            });
        }

        const interval = setInterval(() => { 
            fetchData(); 
            updateTheme();
        }, 3000);
        return () => clearInterval(interval);
    }, [fetchData]);

    /**
     * Validates the selected project filter against the available projects and falls
     * back to 'all' when the selected project is no longer present.
     */
    useEffect(() => {
        if (projectFilter === 'all') return;

        const projectExists = data.projects.some(p => p.id === projectFilter);
        if (!projectExists) {
            setProjectFilter('all');
        }
    }, [data.projects, projectFilter]);

    /**
     * Opens the task creation dialog, pre-selecting the active project filter when one
     * is set, then refreshes the dashboard data. Concurrent invocations are ignored.
     */
    const handleOpenCreateTaskDialog = async () => {
        if (isDialogOpen.current) return;
        isDialogOpen.current = true;
        try {
            await window.webviewApi.postMessage({ 
                name: 'openCreateTaskDialog',
                payload: { projectId: projectFilter === 'all' ? undefined : projectFilter }
            });
            await fetchData();
        } catch (error) {
            console.error("Error opening create task dialog:", error);
        } finally {
            isDialogOpen.current = false;
        }
    };

    /**
     * Opens the edit dialog for a task and refreshes the dashboard data afterwards.
     * Concurrent invocations are ignored.
     * @param task The task to edit.
     */
    const handleOpenEditTaskDialog = async (task: Task) => {
        if (isDialogOpen.current) return;
        isDialogOpen.current = true;
        try {
            await window.webviewApi.postMessage({ name: 'openEditTaskDialog', payload: { task } });
            await fetchData();
        } catch (error) {
            console.error("Error opening edit task dialog:", error);
        } finally {
            isDialogOpen.current = false;
        }
    };

    /**
     * Triggers a Joplin synchronization.
     */
    const handleSync = async () => {
        try {
            await window.webviewApi.postMessage({ name: 'synchronize' });
        } catch (error) {
            console.error("Error triggering sync:", error);
        }
    };

    /**
     * Sends the appropriate layout command to Joplin for toggling the sidebar, note
     * list, or menu bar, or for resetting the layout.
     * @param type The layout action to perform.
     */
    const handleToggleLayout = async (type: 'sideBar' | 'noteList' | 'menuBar' | 'reset') => {
        try {
            let messageName = '';
            if (type === 'sideBar') messageName = 'toggleSideBar';
            else if (type === 'noteList') messageName = 'toggleNoteList';
            else if (type === 'menuBar') messageName = 'toggleMenuBar';
            else if (type === 'reset') messageName = 'resetLayout';

            await window.webviewApi.postMessage({ name: messageName });
        } catch (error) {
            console.error(`Error handling layout ${type}:`, error);
        }
    };
    /**
     * Optimistically updates a task's status in local state, marking all its subtasks
     * complete when moving to 'done' and incomplete when leaving 'done', then persists
     * the change to the backend and refetches on failure.
     * @param taskId The ID of the task whose status changes.
     * @param newStatus The new status value.
     */
    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        const updatedTasks = data.tasks.map(t => {
            if (t.id === taskId) {
                let updatedSubTasks = t.subTasks;
                if (newStatus === 'done') {
                    updatedSubTasks = t.subTasks.map(st => ({ ...st, completed: true }));
                } else if (t.status === 'done') {
                    updatedSubTasks = t.subTasks.map(st => ({ ...st, completed: false }));
                }
                return { ...t, status: newStatus as any, subTasks: updatedSubTasks };
            }
            return t;
        });
        setData({ ...data, tasks: updatedTasks });

        try {
             await window.webviewApi.postMessage({ name: 'updateTaskStatus', payload: { taskId, newStatus } });
        } catch (error) {
            console.error("Error updating status:", error);
            fetchData();
        }
    };

    /**
     * Optimistically updates the completion state of a single subtask in local state,
     * then persists the change to the backend and refetches on failure.
     * @param taskId The ID of the task that owns the subtask.
     * @param subTaskIndex The index of the subtask within the task.
     * @param checked The new completion state.
     */
    const handleToggleSubTask = async (taskId: string, subTaskIndex: number, checked: boolean) => {
         const updatedTasks = data.tasks.map(t => {
             if (t.id === taskId) {
                 const newSubTasks = t.subTasks.map((st, i) =>
                     i === subTaskIndex ? { ...st, completed: checked } : st
                 );
                 return { ...t, subTasks: newSubTasks };
             }
             return t;
         });
         setData({ ...data, tasks: updatedTasks });

         try {
             await window.webviewApi.postMessage({ name: 'toggleSubTask', payload: { taskId, subTaskIndex, checked } });
        } catch (error) {
            console.error("Error toggling subtask:", error);
            fetchData();
        }
    };

    /**
     * Opens the note backing a task in the Joplin editor.
     * @param taskId The ID of the task note to open.
     */
    const handleOpenNote = async (taskId: string) => {
        try {
            await window.webviewApi.postMessage({ name: 'openNote', payload: { taskId } });
        } catch (error) {
            console.error("Error opening note:", error);
        }
    };

    /**
     * Derives the task list shown in the views by filtering on the selected project
     * and the urgency toggle, then sorting according to the active sort option.
     */
    const displayedTasks = React.useMemo(() => {
        let tasks = projectFilter === 'all'
            ? data.tasks 
            : data.tasks.filter(t => t.projectId === projectFilter);

        if (showUrgentOnly) {
            const now = Date.now();
            tasks = tasks.filter(t => {
                const isOverdue = t.dueDate > 0 && t.dueDate < now && t.status !== 'done';
                const isApproaching = t.isApproaching && t.status !== 'done';
                return isOverdue || isApproaching;
            });
        }
        
        return tasks.sort((a, b) => {
            if (sortOption === 'dueDate') {
                const dateA = a.dueDate ? a.dueDate : Number.MAX_VALUE;
                const dateB = b.dueDate ? b.dueDate : Number.MAX_VALUE;
                if (dateA !== dateB) return dateA - dateB;
                return getPriorityValue(a.tags) - getPriorityValue(b.tags);
            } else if (sortOption === 'startDate') {
                const startA = a.startDate || a.createdTime;
                const startB = b.startDate || b.createdTime;
                if (startA !== startB) return startA - startB;
                return (a.dueDate || Number.MAX_VALUE) - (b.dueDate || Number.MAX_VALUE);
            } else if (sortOption === 'priority') {
                const prioA = getPriorityValue(a.tags);
                const prioB = getPriorityValue(b.tags);
                if (prioA !== prioB) return prioA - prioB;
                return (a.dueDate || Number.MAX_VALUE) - (b.dueDate || Number.MAX_VALUE);
            } else if (sortOption === 'createdTime') {
                return b.createdTime - a.createdTime;
            }
            return 0;
        });
    }, [data.tasks, projectFilter, showUrgentOnly, sortOption]);

    if (loading) return <div>Loading tasks...</div>;

    return (
        <div className="dashboard-container">
            <div className="header">
                <div className="controls-container">
                    {data.projects.length > 1 ? (
                        <div className="select-wrapper">
                            <select 
                                className="project-filter-select"
                                value={projectFilter} 
                                onChange={(e) => setProjectFilter(e.target.value)}
                            >
                                <option value="all">All Tasks</option>
                                {data.projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <h1>All Tasks</h1>
                    )}
                    <div className="select-wrapper">
                        <select 
                            className="project-filter-select"
                            value={sortOption} 
                            onChange={(e) => setSortOption(e.target.value)}
                            title="Sort by"
                        >
                            <option value="dueDate">Sort by Due Date</option>
                            <option value="startDate">Sort by Start Date</option>
                            <option value="priority">Sort by Priority</option>
                            <option value="createdTime">Sort by Created Time</option>
                        </select>
                    </div>
                    <button 
                        className="action-btn"
                        onClick={handleOpenCreateTaskDialog} 
                        style={{ fontSize: '1.2rem' }}
                        title="New Task"
                    >
                        +
                    </button>
                    <button 
                        className="action-btn"
                        onClick={() => setShowUrgentOnly(!showUrgentOnly)} 
                        style={{ 
                            fontSize: '1rem',
                            backgroundColor: showUrgentOnly ? 'var(--prj-overdue)' : undefined,
                            color: showUrgentOnly ? 'white' : undefined,
                            borderColor: showUrgentOnly ? 'var(--prj-overdue)' : undefined
                        }}
                        title="Show only urgent tasks (Overdue & Approaching)"
                    >
                        🚨
                    </button>
                    <button 
                        className="action-btn"
                        onClick={handleSync} 
                        style={{ fontSize: '1rem' }}
                        title="Synchronize"
                    >
                        ↻
                    </button>
                    <div className="layout-controls">
                        <button 
                            className="layout-btn"
                            onClick={() => handleToggleLayout('sideBar')}
                            title="Toggle Sidebar"
                        >
                            📂
                        </button>
                        <button 
                            className="layout-btn"
                            onClick={() => handleToggleLayout('noteList')}
                            title="Toggle Note List"
                        >
                            📑
                        </button>
                        <button 
                            className="layout-btn"
                            onClick={() => handleToggleLayout('menuBar')}
                            title="Toggle Menu Bar"
                        >
                            🛠️
                        </button>
                        <button 
                            className="layout-btn"
                            onClick={() => handleToggleLayout('reset')}
                            title="Reset Layout"
                        >
                            🧹
                        </button>
                    </div>
                </div>
                <div className="tabs">
                    <button onClick={() => setActiveTab('kanban')} className={activeTab === 'kanban' ? 'active' : ''}>Kanban</button>
                    <button onClick={() => setActiveTab('timeline')} className={activeTab === 'timeline' ? 'active' : ''}>Timeline</button>
                    <button onClick={() => setActiveTab('table')} className={activeTab === 'table' ? 'active' : ''}>List</button>
                    <button onClick={() => setActiveTab('wiki')} className={activeTab === 'wiki' ? 'active' : ''}>Wiki</button>
                    <button onClick={() => setActiveTab('info')} className={activeTab === 'info' ? 'active' : ''}>Guide</button>
                </div>
            </div>
            
            <div className="content">
                {activeTab === 'kanban' && <KanbanBoard 
                    tasks={displayedTasks} 
                    onUpdateStatus={handleUpdateStatus}
                    onToggleSubTask={handleToggleSubTask}
                    onOpenNote={handleOpenNote}
                    onEditTask={handleOpenEditTaskDialog}
                />}
                {activeTab === 'timeline' && <TimelineView 
                    tasks={displayedTasks} 
                    onOpenNote={handleOpenNote} 
                    onEditTask={handleOpenEditTaskDialog}
                />}
                {activeTab === 'table' && <ListView 
                    tasks={displayedTasks} 
                    onOpenNote={handleOpenNote} 
                    onEditTask={handleOpenEditTaskDialog}
                />}
                {activeTab === 'wiki' && <WikiView 
                    projectId={projectFilter}
                    onOpenNote={handleOpenNote}
                    onToggleSubTask={handleToggleSubTask}
                    lastUpdated={lastUpdated}
                />}
                {activeTab === 'info' && <InfoView />}
            </div>
        </div>
    );
};

export default App;