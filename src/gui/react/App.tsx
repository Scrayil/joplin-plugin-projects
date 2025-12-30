import * as React from 'react';
import { useState, useEffect } from 'react';
import { Task, DashboardData } from './types';
import KanbanBoard from './components/KanbanBoard';
import TimelineView from './components/TimelineView';
import ListView from './components/ListView';
import InfoView from './components/InfoView';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'kanban' | 'timeline' | 'table' | 'info'>('kanban');
    const [data, setData] = useState<DashboardData>({ projects: [], tasks: [] });
    const [loading, setLoading] = useState(true);
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const isFetching = React.useRef(false);

    const fetchData = React.useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        try {
            const response = await window.webviewApi.postMessage({ name: 'getData' });
            setData(response);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            isFetching.current = false;
        }
    }, []);

    useEffect(() => {
        const updateTheme = () => {
            const textColor = getComputedStyle(document.body).getPropertyValue('--joplin-color').trim();
            let isDark = false;
            if (textColor.startsWith('#')) {
                const hex = textColor.substring(1);
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                if (brightness > 128) isDark = true;
            }
            document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
            document.documentElement.style.setProperty('accent-color', 'var(--joplin-selected-color)');
        };
        updateTheme();

        fetchData();

        if (window.webviewApi && window.webviewApi.onMessage) {
            window.webviewApi.onMessage((message: any) => {
                if (message.name === 'dataChanged') {
                    fetchData();
                }
            });
        }

        const interval = setInterval(() => { fetchData(); }, 3000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleOpenCreateTaskDialog = async () => {
        try {
            await window.webviewApi.postMessage({ name: 'openCreateTaskDialog' });
            await fetchData();
        } catch (error) {
            console.error("Error opening create task dialog:", error);
        }
    };

    const handleOpenEditTaskDialog = async (task: Task) => {
        try {
            await window.webviewApi.postMessage({ name: 'openEditTaskDialog', payload: { task } });
            await fetchData();
        } catch (error) {
            console.error("Error opening edit task dialog:", error);
        }
    };

    const handleSync = async () => {
        try {
            await window.webviewApi.postMessage({ name: 'synchronize' });
        } catch (error) {
            console.error("Error triggering sync:", error);
        }
    };

    const handleToggleLayout = async (type: 'sideBar' | 'noteList' | 'menuBar') => {
        try {
            let messageName = '';
            if (type === 'sideBar') messageName = 'toggleSideBar';
            else if (type === 'noteList') messageName = 'toggleNoteList';
            else if (type === 'menuBar') messageName = 'toggleMenuBar';
            
            await window.webviewApi.postMessage({ name: messageName });
        } catch (error) {
            console.error(`Error toggling ${type}:`, error);
        }
    };

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

    const handleToggleSubTask = async (taskId: string, subTaskTitle: string, checked: boolean) => {
         const updatedTasks = data.tasks.map(t => {
             if (t.id === taskId) {
                 const newSubTasks = t.subTasks.map(st => 
                     st.title === subTaskTitle ? { ...st, completed: checked } : st
                 );
                 return { ...t, subTasks: newSubTasks };
             }
             return t;
         });
         setData({ ...data, tasks: updatedTasks });

         try {
             await window.webviewApi.postMessage({ name: 'toggleSubTask', payload: { taskId, subTaskTitle, checked } });
        } catch (error) {
            console.error("Error toggling subtask:", error);
            fetchData();
        }
    };

    const handleOpenNote = async (taskId: string) => {
        try {
            await window.webviewApi.postMessage({ name: 'openNote', payload: { taskId } });
        } catch (error) {
            console.error("Error opening note:", error);
        }
    };

    const displayedTasks = projectFilter === 'all' 
        ? data.tasks 
        : data.tasks.filter(t => t.projectId === projectFilter);

    if (loading) return <div>Loading tasks...</div>;

    return (
        <div className="dashboard-container">
            <div className="header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {data.projects.length > 1 ? (
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
                    ) : (
                        <h1>All Tasks</h1>
                    )}
                    <button 
                        onClick={handleOpenCreateTaskDialog} 
                        style={{ 
                            background: 'var(--primary-btn-bg)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                        }}
                        title="New Task"
                    >
                        +
                    </button>
                    <button 
                        onClick={handleSync} 
                        style={{ 
                            background: 'var(--primary-btn-bg)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            fontWeight: 'bold'
                        }}
                        title="Synchronize"
                    >
                        ↻
                    </button>
                    <div style={{ marginLeft: '10px', display: 'flex', gap: '10px', borderLeft: '1px solid var(--border-color)', paddingLeft: '15px' }}>
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
                    </div>
                </div>
                <div className="tabs">
                    <button onClick={() => setActiveTab('kanban')} className={activeTab === 'kanban' ? 'active' : ''}>Kanban</button>
                    <button onClick={() => setActiveTab('timeline')} className={activeTab === 'timeline' ? 'active' : ''}>Timeline</button>
                    <button onClick={() => setActiveTab('table')} className={activeTab === 'table' ? 'active' : ''}>List</button>
                    <button onClick={() => setActiveTab('info')} className={activeTab === 'info' ? 'active' : ''}>Info</button>
                </div>
            </div>
            
            <div className="content">
                {activeTab === 'kanban' && <KanbanBoard 
                    tasks={displayedTasks} 
                    projects={data.projects} 
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
                {activeTab === 'info' && <InfoView />}
            </div>
        </div>
    );
};

export default App;