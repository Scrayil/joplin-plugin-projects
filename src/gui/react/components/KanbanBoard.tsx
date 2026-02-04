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
    onToggleSubTask: (taskId: string, subTaskIndex: number, checked: boolean) => void;
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

    /**
     * Handles the end of a drag-and-drop operation for tasks.
     * Updates the task status if moved to a different column.
     * @param result The drop result object from react-beautiful-dnd.
     */
    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;
        onUpdateStatus(draggableId, destination.droppableId);
    };

    /**
     * Triggers the deletion process for a task.
     * @param task The task to delete.
     */
    const handleDeleteTask = (task: Task) => {
        window.webviewApi.postMessage({ name: 'deleteTask', payload: { task } });
    };

    /**
     * Opens the custom context menu for a task card.
     * @param e The mouse event.
     * @param task The task associated with the context menu.
     */
    const handleContextMenu = (e: React.MouseEvent, task: Task) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, task });
    };

    /**
     * Renders visual tags for a task (e.g. Priority).
     * @param tags Array of tag strings.
     */
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

    /**
     * Renders the list of subtasks for a task card.
     * Handles nested indentation and checkbox toggling.
     * @param task The parent task containing subtasks.
     */
    const renderSubTasks = (task: Task) => {
        if (!task.subTasks || task.subTasks.length === 0) return null;
        return (
            <div className="task-subtasks-container">
                {task.subTasks.map((st: any, i) => {
                    const level = st.level || 0;
                    
                    return (
                        <div key={i} style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', // Align to top for multi-line text
                            gap: '6px', 
                            fontSize: '0.9rem', 
                            marginBottom: '4px'
                        }}>
                            {/* Indentation Hyphens placed BEFORE the checkbox */}
                            {level > 0 && (
                                <span style={{
                                    color: 'var(--joplin-divider-color)',
                                    fontFamily: 'monospace',
                                    fontWeight: 'bold',
                                    userSelect: 'none',
                                    marginRight: '2px',
                                    flexShrink: 0,
                                    marginTop: '3px' // Visual alignment with first line of text
                                }}>
                                    {'-'.repeat(level)}
                                </span>
                            )}

                            <input 
                                type="checkbox" 
                                checked={st.completed} 
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onToggleSubTask(task.id, i, e.target.checked);
                                }}
                                style={{ 
                                    cursor: 'pointer', 
                                    flexShrink: 0,
                                    marginTop: '3px' // Visual alignment with first line of text
                                }}
                            />
                            <span 
                                style={{ 
                                    textDecoration: st.completed ? 'line-through' : 'none', 
                                    color: st.completed ? 'var(--joplin-divider-color)' : 'var(--text-color)',
                                    opacity: st.completed ? 0.6 : 1,
                                    overflowWrap: 'anywhere',
                                    lineHeight: '1.4'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const target = e.target as HTMLElement;
                                    if (target.tagName === 'A') {
                                        e.preventDefault();
                                        const href = (target as HTMLAnchorElement).href;
                                        window.webviewApi.postMessage({ name: 'openExternal', payload: href });
                                    }
                                }}
                                dangerouslySetInnerHTML={{ 
                                    __html: DOMPurify.sanitize(mdParser.renderInline(st.title), { 
                                        ADD_ATTR: ['target'],
                                        ALLOWED_URI_REGEXP: /^https?:/i 
                                    }) 
                                }} 
                            />
                        </div>
                    );
                })}
            </div>
        );
    };

    /**
     * Renders a single Kanban column with its contained tasks.
     * @param status The status ID of the column (todo, in_progress, done).
     * @param title The display title of the column.
     */
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
                                const isApproaching = task.isApproaching && !isOverdue && task.status !== 'done';
                                return (
                                    <Draggable key={task.id} draggableId={task.id} index={index}>
                                        {(provided) => (
                                            <div 
                                                className={`task-card ${status === 'done' ? 'done' : ''} ${isOverdue ? 'overdue' : ''} ${isApproaching ? 'approaching' : ''}`}
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{ ...provided.draggableProps.style, cursor: 'pointer' }}
                                                onDoubleClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                                onContextMenu={(e) => handleContextMenu(e, task)}
                                                title={`${task.projectName}\n${task.title}${task.dueDate > 0 ? `\n${isOverdue ? '(Overdue) ' : (isApproaching ? '(Approaching) ' : '')}${formatDate(task.dueDate)}` : ''}`}
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