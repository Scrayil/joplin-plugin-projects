import * as React from 'react';
import { useState, useEffect } from 'react';
import { Task, Project, DashboardData } from './types';
import KanbanBoard from './components/KanbanBoard';
import CreateTaskForm from './components/CreateTaskForm';

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'kanban' | 'calendar' | 'table' | 'new_task'>('kanban');
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
        console.log("App mounted. webviewApi:", window.webviewApi);
        fetchData();

        // Listen for backend updates
        if (window.webviewApi && window.webviewApi.onMessage) {
            // Notify backend that we are listening
            window.webviewApi.postMessage({ name: 'log', message: 'Frontend: Registering onMessage listener' });
            
            window.webviewApi.onMessage((message: any) => {
                // Notify backend that we received a message
                window.webviewApi.postMessage({ name: 'log', message: `Frontend: Received message ${JSON.stringify(message)}` });
                
                if (message.name === 'dataChanged') {
                    console.log('Backend data changed, refreshing...');
                    fetchData();
                }
            });
        } else {
            console.error("webviewApi.onMessage not available");
        }

        // Fallback polling every 3 seconds to ensure sync
        const interval = setInterval(() => {
            fetchData();
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchData]);

    const handleCreateTask = async (title: string, projectId: string, subTasks: string[], urgency: string, dueDate: number | undefined) => {
        try {
            await window.webviewApi.postMessage({ 
                name: 'createTask', 
                payload: { title, projectId, subTasks, urgency, dueDate } 
            });
            // Refresh data
            await fetchData();
            // Optionally switch back to kanban
            setActiveTab('kanban');
        } catch (error) {
            console.error("Error creating task:", error);
        }
    };

    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        // Optimistic update
        const updatedTasks = data.tasks.map(t => {
            if (t.id === taskId) {
                // Moving to done: mark all subtasks as completed
                // Moving out of done: unmark all subtasks
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
             await window.webviewApi.postMessage({ 
                name: 'updateTaskStatus', 
                payload: { taskId, newStatus } 
            });
            // We might want to re-fetch to confirm consistency, but optimistic is smoother
        } catch (error) {
            console.error("Error updating status:", error);
            fetchData(); // Revert on error
        }
    };

    const handleToggleSubTask = async (taskId: string, subTaskTitle: string, checked: boolean) => {
         // Optimistic update
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
             await window.webviewApi.postMessage({ 
                name: 'toggleSubTask', 
                payload: { taskId, subTaskTitle, checked } 
            });
        } catch (error) {
            console.error("Error toggling subtask:", error);
            fetchData();
        }
    };

    // Filter tasks based on selected project
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
                        onClick={() => setActiveTab('new_task')} 
                        className={activeTab === 'new_task' ? 'active' : ''}
                        style={{ 
                            background: activeTab === 'new_task' ? 'var(--primary-color)' : 'transparent',
                            color: activeTab === 'new_task' ? 'white' : 'var(--text-color)',
                            border: '1px solid #ddd',
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
                    <button onClick={() => setActiveTab('calendar')} className={activeTab === 'calendar' ? 'active' : ''}>Calendar</button>
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
                {activeTab === 'new_task' && (
                    <div className="centered-view">
                        <CreateTaskForm projects={data.projects} onCreateTask={handleCreateTask} />
                    </div>
                )}
                {activeTab === 'calendar' && <div>Calendar View (Coming Soon)</div>}
                {activeTab === 'table' && <div>Table View (Coming Soon)</div>}
            </div>
        </div>
    );
};

export default App;
