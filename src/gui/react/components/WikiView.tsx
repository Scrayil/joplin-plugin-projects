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
    // Initialize TOC state from localStorage
    const [isTocOpen, setIsTocOpen] = useState(() => {
        const saved = localStorage.getItem('wiki_toc_open');
        return saved !== null ? saved === 'true' : true;
    });

    // Persist TOC state changes
    useEffect(() => {
        localStorage.setItem('wiki_toc_open', String(isTocOpen));
    }, [isTocOpen]);

    const [activeMedia, setActiveMedia] = useState<{ url: string; type: 'video' | 'audio'; name: string } | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const mdParser = useRef(new MarkdownIt({
        html: true,
        linkify: true,
        typographer: true
    }).use(taskLists));
    
    // Allow file:// links for local resources
    mdParser.current.validateLink = (url) => {
        const BAD_PROTO_RE = /^(vbscript|javascript|data):/;
        const GOOD_DATA_RE = /^data:image\/(gif|png|jpeg|webp);/;

        url = url.trim().toLowerCase();
        return BAD_PROTO_RE.test(url) ? !!GOOD_DATA_RE.test(url) : true;
    };

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
        if (el && contentRef.current) {
            // Manual vertical scroll to prevent horizontal movement
            const container = contentRef.current;
            const topPos = el.offsetTop - container.offsetTop;
            container.scrollTo({
                top: topPos - 20, // 20px offset for breathing room
                behavior: 'smooth'
            });
        }
    };

    const handleContentClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'A') {
            const href = (target as HTMLAnchorElement).href;
            if (href.startsWith('file://')) {
                // Extract MIME type from the hash fragment
                let type: 'video' | 'audio' | null = null;
                let mime = '';
                
                try {
                    const urlObj = new URL(href);
                    const hashParams = new URLSearchParams(urlObj.hash.substring(1));
                    mime = hashParams.get('mime') || '';
                } catch (err) {
                    console.warn("Failed to parse URL/MIME:", err);
                }

                if (mime.startsWith('video/')) type = 'video';
                else if (mime.startsWith('audio/')) type = 'audio';

                if (type) {
                    e.preventDefault();
                    setActiveMedia({
                        url: href.split('#')[0],
                        type: type,
                        name: target.innerText || 'Media'
                    });
                }
                // Unsupported resources fall through here.
                // They are made non-clickable via CSS (pointer-events: none), 
                // so no JavaScript handling is needed for them.
            }
        }
    };

    if (loading) return <div style={{ padding: '40px', opacity: 0.6, textAlign: 'center' }}>Loading documentation...</div>;
    if (!wikiData || wikiData.length === 0) return <div style={{ padding: '40px', opacity: 0.6, textAlign: 'center' }}>No documentation found.</div>;

    return (
        <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
            {/* Link Styling */}
            <style>{`
                /* Base Icon Style for all file links */
                .markdown-body a[href*="file://"]::before {
                    font-family: "Font Awesome 5 Free";
                    font-weight: 900;
                    margin-right: 6px;
                    display: inline-block;
                    text-decoration: none;
                    -webkit-font-smoothing: antialiased;
                }

                /* Video Icon */
                .markdown-body a[href*="mime=video"]::before {
                    content: "\\f03d"; /* fa-video */
                }

                /* Audio Icon */
                .markdown-body a[href*="mime=audio"]::before {
                    content: "\\f001"; /* fa-music */
                }

                /* High Contrast for Supported Media (Video/Audio) */
                .markdown-body a[href*="mime=video"],
                .markdown-body a[href*="mime=audio"] {
                    color: var(--joplin-url-color) !important;
                    font-weight: 600;
                    text-decoration: underline;
                    opacity: 1 !important;
                    cursor: pointer;
                }
                .markdown-body a[href*="mime=video"]:hover,
                .markdown-body a[href*="mime=audio"]:hover {
                    filter: brightness(1.2);
                }

                /* Unsupported file resources: Greyed out, non-clickable, Paperclip icon */
                .markdown-body a[href*="file://"]:not([href*="mime=video"]):not([href*="mime=audio"]) {
                    pointer-events: none;
                    cursor: default;
                    color: var(--joplin-color) !important;
                    opacity: 0.65;
                    text-decoration: none;
                    display: inline-flex;
                    align-items: center;
                }

                .markdown-body a[href*="file://"]:not([href*="mime=video"]):not([href*="mime=audio"])::before {
                    content: "\\f0c6"; /* fa-paperclip */
                }
            `}</style>

            {/* Media Overlay */}
            {activeMedia && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'var(--joplin-background-color)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                        <button 
                            onClick={() => setActiveMedia(null)}
                            style={{
                                background: 'none',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                color: 'var(--joplin-color)',
                                marginRight: '15px'
                            }}
                        >
                            ← Back
                        </button>
                        <h3 style={{ margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {activeMedia.name}
                        </h3>
                    </div>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', background: '#000' }}>
                        {activeMedia.type === 'video' && (
                            <video controls autoPlay src={activeMedia.url} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                        )}
                        {activeMedia.type === 'audio' && (
                            <audio controls autoPlay src={activeMedia.url} style={{ width: '80%' }} />
                        )}
                    </div>
                </div>
            )}

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
                <div 
                    ref={contentRef} 
                    onClick={handleContentClick}
                    style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '25px',
                        scrollBehavior: 'smooth', 
                        overflowX: 'hidden', 
                        minWidth: '450px',
                        boxSizing: 'border-box'
                    }}
                >
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
        </div>
    );
};

export default WikiView;