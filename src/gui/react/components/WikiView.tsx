import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { WikiNode } from '../types';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import taskLists from 'markdown-it-task-lists';

interface WikiViewProps {
    projectId: string;
    onOpenNote: (noteId: string) => void;
    lastUpdated: number;
}

const WikiView: React.FC<WikiViewProps> = ({ projectId, onOpenNote, lastUpdated }) => {
    const [wikiData, setWikiData] = useState<WikiNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTocOpen, setIsTocOpen] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);
    const mdParser = useRef(new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true
    }).use(taskLists));

    // Fetch Wiki data
    useEffect(() => {
        let mounted = true;
        const fetchWiki = async () => {
            if (wikiData.length === 0) setLoading(true);
            try {
                const data = await window.webviewApi.postMessage({ 
                    name: 'getWikiData', 
                    payload: { projectId } 
                });
                if (mounted) setWikiData(data);
            } catch (e) {
                console.error("Error loading wiki", e);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchWiki();
        return () => { mounted = false; };
    }, [projectId, lastUpdated]);

    /**
     * Renders markdown content and applies syntax highlighting.
     * Uses a ref to manipulate the DOM directly for optimal performance with external libraries.
     */
    useEffect(() => {
        if (!loading && wikiData) {
            // Render markdown for all content blocks
            contentRef.current?.querySelectorAll('.markdown-content').forEach(el => {
                const markdown = el.getAttribute('data-markdown');
                if (markdown) {
                    el.innerHTML = mdParser.current.render(markdown);
                }
            });
            // Apply syntax highlighting
            contentRef.current?.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block as HTMLElement);
            });
        }
    }, [loading, wikiData]);


    const scrollToSection = (id: string) => {
        const el = document.getElementById(`wiki-section-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    if (loading) return <div style={{ padding: '40px', opacity: 0.6, textAlign: 'center' }}>Loading documentation...</div>;
    if (!wikiData || wikiData.length === 0) return <div style={{ padding: '40px', opacity: 0.6, textAlign: 'center' }}>No documentation found.</div>;

    return (
        <div style={{ display: 'flex', height: '100%', overflowX: 'auto', overflowY: 'hidden', minWidth: '450px' }}>
            {/* Table of Contents (Sidebar) */}
            <div style={{ 
                width: '25%', 
                minWidth: '260px', 
                maxWidth: '400px',
                background: 'var(--column-bg)', 
                overflowY: 'auto',
                padding: '20px 10px',
                flexShrink: 0,
                display: isTocOpen ? 'block' : 'none'
            }}>
                <h3 className="toc-header">Table of Contents</h3>
                {wikiData.map(node => (
                    <div 
                        key={node.id} 
                        onClick={() => scrollToSection(node.id)}
                        title={node.title}
                        style={{ 
                            padding: '4px 8px', 
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            paddingLeft: `${Math.min(node.level, 8) * 12 + 10}px`, 
                            color: 'var(--joplin-color)',
                            opacity: node.type === 'folder' ? 1 : 0.8,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            borderRadius: '4px',
                            fontWeight: node.type === 'folder' ? 600 : 400,
                            '--level': node.level,
                        } as React.CSSProperties}
                        className="toc-item"
                    >
                        {node.type === 'folder' ? '📂 ' : '• '} {node.title}
                    </div>
                ))}
                <style>{`.toc-item:hover { background: var(--joplin-background-color-hover3); color: var(--joplin-color) !important; opacity: 1 !important; }`}</style>
            </div>

            {/* Sidebar Toggle Handle */}
            <div 
                className="sidebar-toggle" 
                onClick={() => setIsTocOpen(!isTocOpen)}
                title={isTocOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            >
                <i className={`fas fa-chevron-${isTocOpen ? 'left' : 'right'}`} style={{ fontSize: '0.9rem' }}></i>
            </div>

            {/* Main Content (Reader) */}
            <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: '40px', scrollBehavior: 'smooth', overflowX: 'hidden', minWidth: '450px' }}>
                {wikiData.map(node => (
                    <div id={`wiki-section-${node.id}`} key={node.id} style={{ marginBottom: '40px' }}>
                        {node.type === 'folder' ? (
                            <h2 
                                className="wiki-folder-header"
                                style={{ 
                                    fontSize: `${Math.max(1.1, 1.5 - (node.level * 0.1))}rem`
                                }}
                            >
                                {node.title}
                            </h2>
                        ) : (
                            <div className="wiki-page">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3 className="wiki-page-header">
                                        <span style={{ fontSize: '1rem' }}>📄</span> {node.title}
                                    </h3>
                                    <button 
                                        onClick={() => onOpenNote(node.id)}
                                        style={{
                                            background: 'none',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            cursor: 'pointer',
                                            fontSize: '0.8rem',
                                            color: 'var(--joplin-color)',
                                            opacity: 0.7
                                        }}
                                        title="Open in Editor"
                                    >
                                        Edit ✏️
                                    </button>
                                </div>
                                
                                <div className="markdown-body" style={{ 
                                    background: 'var(--joplin-background-color)', 
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    padding: '25px',
                                    lineHeight: '1.6',
                                    fontSize: '0.95rem',
                                    overflowX: 'auto'
                                }}>
                                    <div className="markdown-content" data-markdown={node.body || "_No content._"}></div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WikiView;