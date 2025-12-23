import * as React from 'react';
import { Task, Project } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface KanbanBoardProps {
    tasks: Task[];
    projects: Project[];
    onUpdateStatus: (taskId: string, newStatus: string) => void;
    onToggleSubTask: (taskId: string, subTaskTitle: string, checked: boolean) => void;
    onOpenNote: (taskId: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, projects, onUpdateStatus, onToggleSubTask, onOpenNote }) => {
    
    // We categorize tasks for rendering, but DnD needs to know source/destination ID
    const getTasksByStatus = (status: string) => {
        let filteredTasks = [];
        if (status === 'todo') filteredTasks = tasks.filter(t => t.status === 'todo' || t.status === 'overdue');
        else if (status === 'in_progress') filteredTasks = tasks.filter(t => t.status === 'in_progress');
        else if (status === 'done') filteredTasks = tasks.filter(t => t.status === 'done');
        
        const getPriorityValue = (tags: string[]) => {
            if (tags.some(t => t.toLowerCase().includes('high'))) return 1;
            if (tags.some(t => t.toLowerCase().includes('normal') || t.toLowerCase().includes('medium'))) return 2;
            if (tags.some(t => t.toLowerCase().includes('low'))) return 3;
            return 4;
        };

        // Multi-level sort: Due Date (asc) -> Priority (High to Low) -> Creation Date (oldest first)
        return filteredTasks.sort((a, b) => {
            // 1. Due Date
            const dateA = a.dueDate ? a.dueDate : Number.MAX_VALUE;
            const dateB = b.dueDate ? b.dueDate : Number.MAX_VALUE;
            if (dateA !== dateB) return dateA - dateB;

            // 2. Priority
            const prioA = getPriorityValue(a.tags);
            const prioB = getPriorityValue(b.tags);
            if (prioA !== prioB) return prioA - prioB;

            // 3. Creation Date
            return a.createdTime - b.createdTime;
        });
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId;
        onUpdateStatus(draggableId, newStatus);
    };

    const renderTags = (tags: string[]) => {
        if (!tags || tags.length === 0) return null;
        return (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px' }}>
                {tags.map((tag, i) => {
                    let bg = '#eee';
                    let color = '#333';
                    const lowerTag = tag.toLowerCase();
                    if (lowerTag.includes('high')) { bg = '#ffebee'; color = '#c62828'; }
                    else if (lowerTag.includes('medium') || lowerTag.includes('normal')) { bg = '#fff8e1'; color = '#f57f17'; }
                    else if (lowerTag.includes('low')) { bg = '#e3f2fd'; color = '#1565c0'; }
                    
                    return (
                        <span key={i} style={{ fontSize: '0.7rem', background: bg, color: color, padding: '2px 6px', borderRadius: '4px' }}>
                            {tag}
                        </span>
                    );
                })}
            </div>
        );
    };

    const renderSubTasks = (task: Task) => {
        if (!task.subTasks || task.subTasks.length === 0) return null;
        
        return (
            <div className="task-subtasks-container">
                {task.subTasks.map((st, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '4px' }}>
                        <input 
                            type="checkbox" 
                            checked={st.completed} 
                            onChange={(e) => {
                                e.stopPropagation(); // Prevent opening note when clicking checkbox
                                onToggleSubTask(task.id, st.title, e.target.checked);
                            }}
                            style={{ cursor: 'pointer' }}
                        />
                        <span style={{ 
                            textDecoration: st.completed ? 'line-through' : 'none', 
                            color: st.completed ? 'var(--joplin-divider-color)' : 'var(--text-color)',
                            opacity: st.completed ? 0.6 : 1
                        }}>
                            {st.title}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    const renderColumn = (status: string, title: string) => {
        const columnTasks = getTasksByStatus(status);
        
        return (
            <Droppable droppableId={status}>
                {(provided) => (
                    <div 
                        className="column" 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                    >
                        <div className="column-header">
                            <h3>{title}</h3>
                            <span className="count-badge">{columnTasks.length}</span>
                        </div>
                        
                        <div className="task-list">
                            {columnTasks.map((task, index) => (
                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided) => (
                                        <div 
                                            className={`task-card ${status === 'done' ? 'done' : ''}`}
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={{ ...provided.draggableProps.style, cursor: 'pointer' }} // Added cursor
                                            onClick={() => onOpenNote(task.id)} // Added onClick
                                        >
                                            <div className="task-title">
                                                <span className="task-project-tag">[{task.projectName}]</span>
                                                {task.title}
                                            </div>
                                            {renderTags(task.tags)}
                                            {renderSubTasks(task)}
                                            {task.dueDate > 0 && <div className="task-due">Due: {new Date(task.dueDate).toLocaleString()}</div>}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    </div>
                )}
            </Droppable>
        );
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="kanban-board">
                {renderColumn('todo', 'To Do')}
                {renderColumn('in_progress', 'In Progress')}
                {renderColumn('done', 'Done')}
            </div>
        </DragDropContext>
    );
};

export default KanbanBoard;
