import * as React from 'react';
import { Task, Project } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {formatDate} from "../utils";
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';
import TaskContextMenu from './TaskContextMenu';

interface KanbanBoardProps {
    tasks: Task[];
    onUpdateStatus: (taskId: string, newStatus: string) => void;
    onToggleSubTask: (taskId: string, subTaskTitle: string, checked: boolean) => void;
    onOpenNote: (taskId: string) => void;
    onEditTask: (task: Task) => void;
}

/**
 * Renders tasks in a Kanban-style board with draggable cards.
 * Columns: To Do, In Progress, Done.
 */
const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onUpdateStatus, onToggleSubTask, onOpenNote, onEditTask }) => {
    
    const [contextMenu, setContextMenu] = React.useState<{x: number, y: number, task: Task} | null>(null);

    // Memoize parser to avoid re-creation on every render
    const mdParser = React.useMemo(() => new MarkdownIt({
        html: false, // Security: Disable HTML input, only allow Markdown syntax
        linkify: true, // Auto-convert URLs to links
        typographer: true
    }), []);

    /**
     * Filters and sorts tasks for a specific column (status).
     * Sorts by Due Date -> Priority -> Creation Time.
     */
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

        return filteredTasks.sort((a, b) => {
            const dateA = a.dueDate ? a.dueDate : Number.MAX_VALUE;
            const dateB = b.dueDate ? b.dueDate : Number.MAX_VALUE;
            if (dateA !== dateB) return dateA - dateB;
            const prioA = getPriorityValue(a.tags);
            const prioB = getPriorityValue(b.tags);
            if (prioA !== prioB) return prioA - prioB;
            return a.createdTime - b.createdTime;
        });
    };

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;
        onUpdateStatus(draggableId, destination.droppableId);
    };

    const handleDeleteTask = (task: Task) => {
        window.webviewApi.postMessage({ name: 'deleteTask', payload: { task } });
    };

    const handleContextMenu = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, task });
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
                    return <span key={i} style={{ fontSize: '0.7rem', background: bg, color: color, padding: '2px 6px', borderRadius: '4px' }}>{tag}</span>;
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
                                e.stopPropagation();
                                onToggleSubTask(task.id, st.title, e.target.checked);
                            }}
                            style={{ cursor: 'pointer', flexShrink: 0 }}
                        />
                        <span 
                            style={{ 
                                textDecoration: st.completed ? 'line-through' : 'none', 
                                color: st.completed ? 'var(--joplin-divider-color)' : 'var(--text-color)',
                                opacity: st.completed ? 0.6 : 1,
                                overflowWrap: 'anywhere' // Ensure long URLs wrap
                            }}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent opening the note card
                                const target = e.target as HTMLElement;
                                // Intercept link clicks to force external browser
                                if (target.tagName === 'A') {
                                    e.preventDefault();
                                    const href = (target as HTMLAnchorElement).href;
                                    window.webviewApi.postMessage({ name: 'openExternal', payload: href });
                                }
                            }}
                            dangerouslySetInnerHTML={{ 
                                __html: DOMPurify.sanitize(mdParser.renderInline(st.title), { 
                                    ADD_ATTR: ['target'],
                                    ALLOWED_URI_REGEXP: /^https?:/i // Strictly allow only http and https
                                }) 
                            }} 
                        />
                    </div>
                ))}
            </div>
        );
    };

    const renderColumn = (status: string, title: string) => {
        const columnTasks = getTasksByStatus(status);
        let displayedTasks = columnTasks;
        let hiddenCount = 0;

        if (status === 'done') {
            const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            displayedTasks = columnTasks.filter(t => !t.completedTime || t.completedTime >= oneMonthAgo);
            hiddenCount = columnTasks.length - displayedTasks.length;
        }

        return (
            <Droppable droppableId={status}>
                {(provided) => (
                    <div className="column" ref={provided.innerRef} {...provided.droppableProps}>
                        <div className="column-header">
                            <h3>{title}</h3>
                            <span className="count-badge" title={hiddenCount > 0 ? `${hiddenCount} old tasks hidden` : ''}>
                                {hiddenCount > 0 ? `${displayedTasks.length} / ${columnTasks.length}` : displayedTasks.length}
                            </span>
                        </div>
                        <div className="task-list">
                            {displayedTasks.map((task, index) => {
                                const isOverdue = task.dueDate > 0 && task.dueDate < Date.now() && task.status !== 'done';
                                return (
                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                        {(provided) => (
                                            <div 
                                                className={`task-card ${status === 'done' ? 'done' : ''} ${isOverdue ? 'overdue' : ''}`}
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{ ...provided.draggableProps.style, cursor: 'pointer' }}
                                                onDoubleClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                                onContextMenu={(e) => handleContextMenu(e, task)}
                                                title={`${task.projectName}\n${task.title}${task.dueDate > 0 ? `\n${formatDate(task.dueDate)}` : ''}`}
                                            >
                                                <div className="task-title">
                                                    <span className="task-project-tag">[{task.projectName}]</span>
                                                    {task.title}
                                                </div>
                                                {renderTags(task.tags)}
                                                {renderSubTasks(task)}
                                                {task.dueDate > 0 && <div className="task-due">Due: {formatDate(task.dueDate)}</div>}
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })}
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
                {renderColumn('todo', '⚪ To Do')}
                {renderColumn('in_progress', '🟡 In Progress')}
                {renderColumn('done', '🟢 Done')}
                
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
        </DragDropContext>
    );
};

export default KanbanBoard;