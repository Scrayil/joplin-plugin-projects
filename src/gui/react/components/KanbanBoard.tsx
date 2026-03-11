import * as React from 'react';
import { Task, Project } from '../types';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
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

    const [expandedTask, setExpandedTask] = React.useState<string | null>(null);

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
     * @param result The drop result object from @hello-pangea/dnd.
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
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '5px', marginBottom: '8px' }}>
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
     * Handles nested indentation via expandable <details> cards.
     * @param task The parent task containing subtasks.
     */
    const renderSubTasks = (task: Task) => {
        if (!task.subTasks || task.subTasks.length === 0) return null;

        // Build a tree from flat subtasks array
        const tree: any[] = [];
        const stack: { node: any, level: number }[] = [];

        task.subTasks.forEach((st: any, index: number) => {
            const node = { ...st, originalIndex: index, children: [] };
            const level = st.level || 0;

            while (stack.length > 0 && stack[stack.length - 1].level >= level) {
                stack.pop();
            }

            if (stack.length > 0) {
                stack[stack.length - 1].node.children.push(node);
            } else {
                tree.push(node);
            }

            stack.push({ node, level });
        });

        const renderNode = (node: any) => {
            const hasChildren = node.children && node.children.length > 0;
            
            const content = (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', flex: 1, padding: '2px 0' }}>
                    <input 
                        type="checkbox" 
                        checked={node.completed} 
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleSubTask(task.id, node.originalIndex, e.target.checked);
                        }}
                        style={{ cursor: 'pointer', flexShrink: 0, marginTop: '3px' }}
                    />
                    <span 
                        style={{ 
                            textDecoration: node.completed ? 'line-through' : 'none', 
                            color: 'var(--text-color)',
                            opacity: node.completed ? 0.6 : 1,
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
                            __html: DOMPurify.sanitize(mdParser.renderInline(node.title), { 
                                ADD_ATTR: ['target'],
                                ALLOWED_URI_REGEXP: /^https?:/i 
                            }) 
                        }} 
                    />
                </div>
            );

            if (hasChildren) {
                return (
                    <details 
                        key={node.originalIndex} 
                        open
                        className="subtask-details-node"
                        style={{ 
                            marginBottom: '6px', 
                            marginTop: '6px',
                            background: 'transparent', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '6px',
                            overflow: 'hidden'
                        }}
                    >
                        <summary style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            cursor: 'pointer',
                            background: 'color-mix(in srgb, var(--joplin-background-color-hover3) 40%, transparent)', 
                            padding: '4px 8px',
                            borderBottom: '1px solid var(--joplin-divider-color)',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            userSelect: 'none'
                        }}>
                            <span className="subtask-details-chevron" style={{ 
                                fontSize: '0.7rem', 
                                marginRight: '6px', 
                                opacity: 0.6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '12px'
                            }}>
                                ▼
                            </span>
                            {content}
                        </summary>
                        <div style={{ padding: '6px 8px' }}>
                            {node.children.map((child: any) => renderNode(child))}
                        </div>
                    </details>
                );
            }

            return (
                <div key={node.originalIndex} style={{ padding: '0 4px', fontSize: '0.9rem' }}>
                    {content}
                </div>
            );
        };

        const isExpanded = expandedTask === task.id;

        return (
            <React.Fragment>
                {isExpanded && (
                    <div 
                        className="subtasks-expanded-backdrop" 
                        onClick={(e) => { e.stopPropagation(); setExpandedTask(null); }}
                    />
                )}
                <div className={`task-subtasks-wrapper ${isExpanded ? 'subtasks-expanded-overlay' : ''}`} style={!isExpanded ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' } : {}}>
                    {isExpanded && (
                        <div className="subtasks-expanded-header">
                            <h3>Subtasks for: {task.title}</h3>
                            <button className="subtasks-close-btn" onClick={(e) => { e.stopPropagation(); setExpandedTask(null); }}>
                                &times;
                            </button>
                        </div>
                    )}
                    <div className={`task-subtasks-container ${isExpanded ? 'expanded' : ''}`} style={{ marginTop: (!isExpanded) ? '8px' : '0', overflowY: 'auto', flex: 1, minHeight: 0, maxHeight: '100%' }}>
                        {tree.map(node => renderNode(node))}
                    </div>
                </div>
            </React.Fragment>
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
                                                style={{ ...provided.draggableProps.style, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                                                onDoubleClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                                                onContextMenu={(e) => handleContextMenu(e, task)}
                                                title={`${task.projectName}\n${task.title}${task.dueDate > 0 ? `\n${isOverdue ? '(Overdue) ' : (isApproaching ? '(Approaching) ' : '')}${formatDate(task.dueDate)}` : ''}`}
                                            >
                                                <div className="task-title">
                                                    <span className="task-project-tag">[{task.projectName}]</span>
                                                    {task.title}
                                                </div>
                                                {renderTags(task.tags)}
                                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                                    {renderSubTasks(task)}
                                                </div>
                                                {task.dueDate > 0 && <div className="task-due" style={{ flexShrink: 0 }}>Due: {formatDate(task.dueDate)}</div>}
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
                        onExpandSubtasks={
                            (contextMenu.task.subTasks && contextMenu.task.subTasks.length > 0) 
                                ? () => setExpandedTask(contextMenu.task.id) 
                                : undefined
                        }
                    />
                )}
            </div>
        </DragDropContext>
    );
};

export default KanbanBoard;