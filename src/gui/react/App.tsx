import * as React from 'react';
import { useState, useEffect } from 'react';
import { Task, Project, DashboardData } from './types';
import KanbanBoard from './components/KanbanBoard';
import CreateTaskForm from './components/CreateTaskForm';
import TimelineView from './components/TimelineView';
import ListView from './components/ListView';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'kanban' | 'timeline' | 'table'>('kanban');
    const [data, setData] = useState<DashboardData>({ projects: [], tasks: [] });
    const [loading, setLoading] = useState(true);
    const [projectFilter, setProjectFilter] = useState<string>('all');

    const fetchData = React.useCallback(async () => {
        try {
            console.log('Fetching data...');
            const response = await window.webviewApi.postMessage({ name: 'getData' });
            console.log('Received data:', response);
            setData(response);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Theme detection logic (omitted for brevity, assume it's there from previous step)
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

        console.log("App mounted. webviewApi:", window.webviewApi);
        fetchData();

        if (window.webviewApi && window.webviewApi.onMessage) {
            window.webviewApi.postMessage({ name: 'log', message: 'Frontend: Registering onMessage listener' });
            window.webviewApi.onMessage((message: any) => {
                window.webviewApi.postMessage({ name: 'log', message: `Frontend: Received message ${JSON.stringify(message)}` });
                if (message.name === 'dataChanged') {
                    console.log('Backend data changed, refreshing...');
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
            // The dialog handles creation. Backend will trigger 'dataChanged' via onNoteChange or we can refresh manually.
            // Since onNoteChange is debounced, a manual refresh here might be faster if we wait for the promise.
            await fetchData();
        } catch (error) {
            console.error("Error opening create task dialog:", error);
        }
    };

    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        // Optimistic update
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
                        <h1>Project Tasks</h1>
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
                </div>
                <div className="tabs">
                    <button onClick={() => setActiveTab('kanban')} className={activeTab === 'kanban' ? 'active' : ''}>Kanban</button>
                    <button onClick={() => setActiveTab('timeline')} className={activeTab === 'timeline' ? 'active' : ''}>Timeline</button>
                    <button onClick={() => setActiveTab('table')} className={activeTab === 'table' ? 'active' : ''}>List</button>
                </div>
            </div>
            
            <div className="content">
                {activeTab === 'kanban' && <KanbanBoard 
                    tasks={displayedTasks} 
                    projects={data.projects} 
                    onUpdateStatus={handleUpdateStatus}
                    onToggleSubTask={handleToggleSubTask}
                />}
                {activeTab === 'timeline' && <TimelineView tasks={displayedTasks} />}
                {activeTab === 'table' && <ListView tasks={displayedTasks} />}
            </div>
        </div>
    );
};

export default App;