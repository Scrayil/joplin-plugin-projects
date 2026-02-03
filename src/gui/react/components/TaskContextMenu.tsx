import * as React from 'react';
import { useEffect, useRef } from 'react';

interface TaskContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onGuiEdit: () => void;
    onTextEdit: () => void;
    onDelete: () => void;
}

const TaskContextMenu: React.FC<TaskContextMenuProps> = ({ x, y, onClose, onGuiEdit, onTextEdit, onDelete }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const style: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 10000,
        backgroundColor: 'var(--joplin-background-color)',
        border: '1px solid var(--joplin-divider-color)',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        padding: '5px 0',
        minWidth: '150px',
        color: 'var(--joplin-color)'
    };

    const itemStyle: React.CSSProperties = {
        padding: '8px 15px',
        cursor: 'pointer',
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: 'none',
        border: 'none',
        color: 'inherit',
        fontSize: '14px'
    };

    return (
        <div ref={menuRef} style={style} className="context-menu">
            <button 
                style={itemStyle} 
                onClick={(e) => { e.stopPropagation(); onGuiEdit(); onClose(); }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--joplin-background-color-hover3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                ✏️ GUI Edit
            </button>
            <button 
                style={itemStyle} 
                onClick={(e) => { e.stopPropagation(); onTextEdit(); onClose(); }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--joplin-background-color-hover3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                📝 Text Edit
            </button>
            <div style={{ borderTop: '1px solid var(--joplin-divider-color)', margin: '5px 0' }}></div>
            <button 
                style={{ ...itemStyle, color: 'var(--joplin-color-error, #d32f2f)' }} 
                onClick={(e) => { e.stopPropagation(); onDelete(); onClose(); }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--joplin-background-color-hover3)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                🗑️ Delete
            </button>
        </div>
    );
};

export default TaskContextMenu;