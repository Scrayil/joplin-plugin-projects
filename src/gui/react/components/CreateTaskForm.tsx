import * as React from 'react';
import { useState } from 'react';
import { Project } from '../types';

interface CreateTaskFormProps {
    projects: Project[];
    onCreateTask: (title: string, projectId: string, subTasks: string[], urgency: string, dueDate: number | undefined) => void;
}

/**
 * A form component for creating new tasks.
 * Allows setting title, project, due date, urgency, and subtasks.
 */
const CreateTaskForm: React.FC<CreateTaskFormProps> = ({ projects, onCreateTask }) => {
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [selectedProject, setSelectedProject] = useState(projects.length > 0 ? projects[0].id : '');
    const [subTasks, setSubTasks] = useState<string[]>([]);
    const [currentSubTask, setCurrentSubTask] = useState('');
    const [urgency, setUrgency] = useState<string>('normal');
    const [dueDate, setDueDate] = useState<string>('');

    const handleAddSubTask = () => {
        if (!currentSubTask.trim()) return;
        setSubTasks([...subTasks, currentSubTask.trim()]);
        setCurrentSubTask('');
    };

    const handleCreate = () => {
        if (!newTaskTitle.trim() || !selectedProject) return;
        
        const timestamp = dueDate ? new Date(dueDate).getTime() : undefined;
        
        onCreateTask(newTaskTitle, selectedProject, subTasks, urgency, timestamp);
        setNewTaskTitle('');
        setSubTasks([]);
        setUrgency('normal');
        setDueDate('');
    };

    return (
        <div className="create-task-form">
            <h2>New Task</h2>
            
            <div className="form-group">
                <label>Title</label>
                <input 
                    type="text" 
                    className="form-control"
                    placeholder="Task Title..." 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                />
            </div>

            <div className="form-group">
                <label>Project</label>
                <select 
                    className="form-control"
                    value={selectedProject} 
                    onChange={(e) => setSelectedProject(e.target.value)}
                >
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                    <label>Due Date</label>
                    <input 
                        type="datetime-local" 
                        className="form-control"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        style={{ fontFamily: 'inherit' }}
                    />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                    <label>Urgency</label>
                    <select 
                        className="form-control"
                        value={urgency} 
                        onChange={(e) => setUrgency(e.target.value)}
                    >
                        <option value="high">🔴 High</option>
                        <option value="normal">🟠 Normal</option>
                        <option value="low">🔵 Low</option>
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label>Sub-tasks</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                    <input 
                        type="text" 
                        className="form-control"
                        placeholder="Add sub-task..." 
                        value={currentSubTask}
                        onChange={(e) => setCurrentSubTask(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask()}
                        style={{ flex: 1 }}
                    />
                    <button onClick={handleAddSubTask} className="btn-small">Add</button>
                </div>
                {subTasks.length > 0 && (
                    <ul className="subtask-list">
                        {subTasks.map((st, i) => (
                            <li key={i}>{st}</li>
                        ))}
                    </ul>
                )}
            </div>

            <button onClick={handleCreate} className="btn-primary">Create Task</button>
        </div>
    );
};

export default CreateTaskForm;
