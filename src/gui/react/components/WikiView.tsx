import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { WikiNode } from '../types';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import taskLists from 'markdown-it-task-lists';
import DOMPurify from 'dompurify';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';


/**
 * Instantiates and configures the Markdown parser with extended protocol support.
 * * @returns {MarkdownIt} The configured MarkdownIt instance.
 */
const getConfiguredMdParser = (): MarkdownIt => {
    const md = new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true
    }).use(taskLists, { enabled: true });

    md.validateLink = (url: string): boolean => {
        const VALID_URI_REGEX = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;
        return VALID_URI_REGEX.test(url.trim());
    };

    return md;
};

const mdParser = getConfiguredMdParser();

interface WikiViewProps {
    projectId: string;
    onOpenNote: (noteId: string) => void;
    onToggleSubTask?: (taskId: string, subTaskIndex: number, checked: boolean) => void;
    lastUpdated: number;
}

const buildTree = (nodes: WikiNode[]) => {
    const tree: any[] = [];
    const map = new Map();
    nodes.forEach(n => map.set(n.id, { ...n, children: [] }));
    nodes.forEach(n => {
        const node = map.get(n.id);
        if (map.has(n.parentId)) map.get(n.parentId).children.push(node);
        else tree.push(node);
    });
    return tree;
};

const TocLevel: React.FC<{ 
    nodes: any[], 
    level: number, 
    parentId: string,
    projectId: string,
    onScrollToSection: (id: string) => void 
}> = ({ nodes, level, parentId, projectId, onScrollToSection }) => {
    const notes = nodes.filter(n => n.type === 'note');
    const folders = nodes.filter(n => n.type === 'folder');

    const renderZone = (items: any[], type: 'note' | 'folder') => (
        <Droppable droppableId={`${type}:${parentId}`} type={`${type.toUpperCase()}_${parentId}`}>
            {(provided, snapshot) => (
                <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    className="toc-level"
                    style={{ 
                        position: 'relative',
                        minHeight: level === 0 ? '100%' : '2px',
                        // Adaptive Drop Hint via CSS Variables
                        background: snapshot.isDraggingOver ? 'var(--drop-hint-bg)' : 'transparent',
                        outline: snapshot.isDraggingOver ? '1px dashed var(--drop-hint-outline)' : 'none',
                        borderRadius: '4px',
                        transition: 'background 0.2s ease',
                        display: 'block',
                        width: '100%'
                    }}
                >
                    {items.map((node, index) => (
                        <Draggable key={node.id} draggableId={node.id} index={index}>
                            {(provided, snapshot) => (
                                <div 
                                    ref={provided.innerRef} 
                                    {...provided.draggableProps} 
                                    {...provided.dragHandleProps}
                                    style={{
                                        ...provided.draggableProps.style,
                                        marginBottom: '1px',
                                        background: snapshot.isDragging ? 'var(--joplin-background-color)' : 'transparent',
                                        boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                                        borderRadius: '4px',
                                        minWidth: 'fit-content'
                                    }}
                                >
                                    <div 
                                        onClick={() => onScrollToSection(node.id)}
                                        className={`toc-item ${node.type}`}
                                        style={{ 
                                            padding: '4px 8px', 
                                            cursor: 'pointer',
                                            fontSize: '0.82rem',
                                            color: 'var(--joplin-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            borderRadius: '4px',
                                            fontWeight: node.type === 'folder' ? 600 : 400,
                                            background: snapshot.isDragging ? 'var(--joplin-background-color-hover3)' : 'transparent',
                                            whiteSpace: 'nowrap',
                                            width: 'max-content',
                                            minWidth: '100%',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <span style={{ marginRight: '6px', width: '14px', flexShrink: 0, textAlign: 'center' }}>
                                            {node.type === 'folder' 
                                                ? (level === 0 ? '◆' : '▼') 
                                                : '•'
                                            }
                                        </span>
                                        <span>{node.title}</span>
                                    </div>
                                    {node.type === 'folder' && node.children && (
                                        <TocLevel 
                                            nodes={node.children} 
                                            level={level + 1} 
                                            parentId={node.id}
                                            projectId={projectId}
                                            onScrollToSection={onScrollToSection}
                                        />
                                    )}
                                </div>
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    );

    return (
        <div 
            className="toc-level-container"
            style={{ 
                position: 'relative',
                paddingLeft: level > 0 ? '12px' : '0',
                marginLeft: level > 0 ? '8px' : '0',
                borderLeft: level > 0 ? '0.5px solid var(--joplin-divider-color)' : 'none',
                display: 'inline-block',
                minWidth: '100%',
                boxSizing: 'border-box'
            }}
        >
            {notes.length > 0 && renderZone(notes, 'note')}
            {renderZone(folders, 'folder')}
        </div>
    );
};

const WikiView: React.FC<WikiViewProps> = ({ projectId, onOpenNote, onToggleSubTask, lastUpdated }) => {
    const [wikiData, setWikiData] = useState<WikiNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTocOpen, setIsTocOpen] = useState(() => {
        const saved = localStorage.getItem('wiki_toc_open');
        return saved !== null ? saved === 'true' : true;
    });

    const [activeMedia, setActiveMedia] = useState<{ url: string; type: 'video' | 'audio'; name: string } | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const wikiTree = useMemo(() => buildTree(wikiData), [wikiData]);
    
    useEffect(() => {
        let mounted = true;
        const fetchWiki = async () => {
            if (wikiData.length === 0) setLoading(true);
            try {
                const data = await window.webviewApi.postMessage({ name: 'getWikiData', payload: { projectId } });
                if (mounted) setWikiData(data);
            } catch (e) {
                console.error("Error loading wiki", e);
            } finally { if (mounted) setLoading(false); }
        };
        fetchWiki();
        return () => { mounted = false; };
    }, [projectId, lastUpdated]);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source } = result;
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

        const [type, parentId] = source.droppableId.split(':');
        const treeCopy = JSON.parse(JSON.stringify(wikiTree));
        let movedNodeId = '';
        
        const findAndMove = (nodes: any[]): boolean => {
            const isRootLevel = (parentId === projectId || parentId === 'all' || parentId === '');
            if (nodes.length > 0 || isRootLevel) {
                const firstNode = nodes[0];
                if ((firstNode && firstNode.parentId === parentId) || (isRootLevel && (nodes.length === 0 || nodes.some(n => n.parentId === parentId)))) {
                    const itemsOfType = nodes.filter(n => n.type === type);
                    const otherItems = nodes.filter(n => n.type !== type);
                    
                    const [movedItem] = itemsOfType.splice(source.index, 1);
                    itemsOfType.splice(destination.index, 0, movedItem);
                    movedNodeId = movedItem.id;
                    
                    const finalOrder = type === 'note' ? [...itemsOfType, ...otherItems] : [...otherItems, ...itemsOfType];
                    nodes.length = 0;
                    nodes.push(...finalOrder);
                    return true;
                }
            }
            for (const node of nodes) {
                if (node.type === 'folder' && node.children && findAndMove(node.children)) return true;
            }
            return false;
        };

        const rootNodes = projectId === 'all' ? treeCopy : treeCopy.filter(n => n.id === projectId);
        if (findAndMove(rootNodes)) {
            const newFlatData: WikiNode[] = [];
            const flatten = (nodes: any[]) => {
                nodes.forEach(n => {
                    const { children, ...nodeData } = n;
                    newFlatData.push(nodeData);
                    if (children) flatten(children);
                });
            };
            flatten(rootNodes);
            setWikiData(newFlatData);

            const findActualProjectId = (nodeId: string): string => {
                const node = newFlatData.find(n => n.id === nodeId);
                if (!node) return nodeId;
                if (node.level === 0) return node.id;
                return findActualProjectId(node.parentId);
            };

            const actualProjectId = projectId === 'all' ? findActualProjectId(movedNodeId) : projectId;
            const siblingsOrder = newFlatData.filter(node => node.parentId === parentId && node.type === type).map(node => node.id);

            try {
                await window.webviewApi.postMessage({ 
                    name: 'saveWikiOrder', 
                    payload: { projectId: actualProjectId, parentId, orderedIds: siblingsOrder } 
                });
            } catch (error) { console.error("Error saving wiki order:", error); }
        }
    };

    const scrollToSection = (id: string) => {
        const el = document.getElementById(`wiki-section-${id}`);
        if (el && contentRef.current) {
            const container = contentRef.current;
            const topPos = el.offsetTop - container.offsetTop;
            container.scrollTo({ top: topPos - 20, behavior: 'smooth' });
        }
    };

    useEffect(() => { localStorage.setItem('wiki_toc_open', String(isTocOpen)); }, [isTocOpen]);

    useEffect(() => {
        if (!loading && wikiData) {
            contentRef.current?.querySelectorAll('.markdown-content').forEach(el => {
                const markdown = el.getAttribute('data-markdown');
                if (markdown) {
                    const cleanHtml = DOMPurify.sanitize(mdParser.render(markdown), {
                        ADD_URI_SAFE_ATTR: ['href', 'src'],
                        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
                    });
                    el.innerHTML = cleanHtml;
                }
            });
            contentRef.current?.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block as HTMLElement));
        }
    }, [loading, wikiData]);

    const handleContentClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'A') {
            const href = (target as HTMLAnchorElement).href;
            if (href.startsWith('file://')) {
                let type: 'video' | 'audio' | null = null;
                let mime = '';
                try {
                    const urlObj = new URL(href);
                    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
                    mime = hashParams.get('mime') || '';
                } catch (err) {}
                if (mime.startsWith('video/')) type = 'video';
                else if (mime.startsWith('audio/')) type = 'audio';
                if (type) {
                    e.preventDefault();
                    setActiveMedia({ url: href.split('#')[0], type: type, name: target.innerText || 'Media' });
                }
            }
        }

        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
            const checkbox = target as HTMLInputElement;
            const noteContainer = target.closest('[id^="wiki-section-"]');
            const markdownContent = target.closest('.markdown-content');
            
            if (noteContainer && markdownContent) {
                const noteId = noteContainer.id.replace('wiki-section-', '');
                const checkboxes = Array.from(markdownContent.querySelectorAll('input[type="checkbox"]'));
                const subTaskIndex = checkboxes.indexOf(checkbox);
                
                if (subTaskIndex !== -1 && onToggleSubTask) {
                    // Note: Prevent default behavior because we handle the check state in backend 
                    // and wait for the update to trickle back through Joplin's watcher.
                    // However, we can also let it happen for visual immediate feedback.
                    onToggleSubTask(noteId, subTaskIndex, checkbox.checked);
                }
            }
        }
    };

    if (loading) return <div style={{ padding: '40px', opacity: 0.6, textAlign: 'center' }}>Loading documentation...</div>;
    if (!wikiData || wikiData.length === 0) return <div style={{ padding: '40px', opacity: 0.6, textAlign: 'center' }}>No documentation found.</div>;

    return (
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
            <style>{`
                .toc-item:hover { background: var(--joplin-background-color-hover3) !important; }
                .toc-sidebar::-webkit-scrollbar, .wiki-reader-content::-webkit-scrollbar { height: 4px; width: 4px; }
                .toc-sidebar::-webkit-scrollbar-thumb, .wiki-reader-content::-webkit-scrollbar-thumb { background: var(--joplin-divider-color); border-radius: 4px; }
                
                .markdown-body a {
                    color: var(--joplin-color) !important;
                    text-decoration: underline;
                }

                /* Adaptive Drop Hint Variables */
                :root {
                    --drop-hint-bg: rgba(255, 255, 255, 0.15);
                    --drop-hint-outline: rgba(255, 255, 255, 0.3);
                }
                /* Joplin Light Theme Detection */
                body.theme-light, [data-theme-appearance="light"] {
                    --drop-hint-bg: rgba(0, 0, 0, 0.08);
                    --drop-hint-outline: rgba(0, 0, 0, 0.2);
                }
            `}</style>

            {activeMedia && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--joplin-background-color)', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                        <button onClick={() => setActiveMedia(null)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', fontSize: '1rem', color: 'var(--joplin-color)', marginRight: '15px' }}>← Back</button>
                        <h3 style={{ margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeMedia.name}</h3>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', background: '#000' }}>
                        {activeMedia.type === 'video' && <video controls autoPlay src={activeMedia.url} style={{ maxWidth: '100%', maxHeight: '100%' }} />}
                        {activeMedia.type === 'audio' && <audio controls autoPlay src={activeMedia.url} style={{ width: '80%' }} />}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                <div className="toc-sidebar" style={{ width: 'fit-content', minWidth: '200px', maxWidth: '320px', background: 'var(--column-bg)', overflowY: 'auto', overflowX: 'auto', padding: '20px 10px', flexShrink: 0, display: isTocOpen ? 'block' : 'none', borderRight: '1px solid var(--border-color)' }}>
                    <h3 className="toc-header" style={{ marginBottom: '15px', paddingLeft: '5px', fontSize: '1rem', whiteSpace: 'nowrap' }}>Table of Contents</h3>
                    <div style={{ display: 'table', minWidth: '100%' }}>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <TocLevel nodes={wikiTree} level={0} parentId={projectId === 'all' ? '' : projectId} projectId={projectId} onScrollToSection={scrollToSection} />
                        </DragDropContext>
                    </div>
                </div>

                <div className="sidebar-toggle" onClick={() => setIsTocOpen(!isTocOpen)} title={isTocOpen ? "Collapse Sidebar" : "Expand Sidebar"}><i className={`fas fa-chevron-${isTocOpen ? 'left' : 'right'}`} style={{ fontSize: '0.9rem' }}></i></div>

                <div ref={contentRef} onClick={handleContentClick} className="wiki-reader-content" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', scrollBehavior: 'smooth', boxSizing: 'border-box' }}>
                    <div style={{ padding: '25px', width: 'fit-content', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        {wikiData.map(node => (
                            <div id={`wiki-section-${node.id}`} key={node.id} style={{ marginBottom: '40px', width: '100%' }}>
                                {node.type === 'folder' ? (
                                    <h2 className="wiki-folder-header" style={{ fontSize: `${Math.max(1.1, 1.5 - (node.level * 0.1))}rem`, margin: '0 0 20px 0', whiteSpace: 'nowrap' }}>{node.title}</h2>
                                ) : (
                                    <div className="wiki-page">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                            <h3 className="wiki-page-header" style={{ margin: 0, whiteSpace: 'nowrap' }}><span style={{ fontSize: '1rem' }}>📄</span> {node.title}</h3>
                                            <button onClick={() => onOpenNote(node.id)} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--joplin-color)', opacity: 0.7, marginLeft: '20px' }} title="Open in Editor">Edit ✏️</button>
                                        </div>
                                        <div className="markdown-body" style={{ background: 'var(--joplin-background-color)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '25px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                            <div className="markdown-content" data-markdown={node.body || "_No content._"}></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WikiView;
