import * as React from 'react';
import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';

/**
 * Renders the "Info" tab, serving as a user guide for the dashboard.
 * 
 * Displays static documentation about plugin features, shortcuts, and the 
 * JSON structure required for custom project templates. Includes syntax 
 * highlighting for the JSON example.
 */
const InfoView: React.FC = () => {
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current) {
            hljs.highlightElement(codeRef.current);
        }
    }, []);

    const exampleJson = `{
    "name": "Project Wiki",
    "children": [
        {
            "name": "Home",
            "is_todo": false,
            "content": [
                "# Project Overview",
                "This note was auto-generated."
            ]
        },
        {
            "name": "Planning",
            "children": [
                {
                    "name": "Kickoff Checklist",
                    "is_todo": true,
                    "content": [
                        "- [ ] Define scope",
                        "- [ ] Assign team"
                    ]
                }
            ]
        }
    ]
}`;

    return (
        <div className="info-view-container" style={{ 
            padding: '0px',
            height: '100%', 
            overflowY: 'auto',
            background: 'var(--joplin-background-color)',
            color: 'var(--joplin-color)',
            lineHeight: '1.7',
            fontSize: '1.1rem'
        }}>
            <h2 style={{ borderBottom: '1px solid var(--joplin-divider-color)', paddingBottom: '15px', fontSize: '1.8rem' }}>Plugin Guide & Interactions</h2>
            
            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🗂️ Overview</h3>
                <p>This plugin helps you manage projects and tasks directly within Joplin. Tasks are identified as "To-do" notes located within the <strong>"Tasks"</strong> sub-folder of your project notebooks.</p>
                
                <h4 style={{ marginTop: '15px', color: 'var(--text-color)', fontSize: '1.1rem' }}>How to toggle the Dashboard:</h4>
                <ul style={{ paddingLeft: '25px', marginTop: '10px' }}>
                    <li style={{ marginBottom: '8px' }}><strong>Note Toolbar Button:</strong> Click the folder icon (<span
                        style={{fontFamily: 'monospace'}}><i className="fas fa-folder-open"></i></span>) in the note
                        toolbar.
                    </li>
                    <li style={{ marginBottom: '8px' }}><strong>Menu:</strong> Go to <em>View &gt; Toggle Project Dashboard</em>.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Shortcut:</strong> Press <code>Ctrl+Alt+P</code> (or <code>Cmd+Opt+P</code> on macOS).</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>📋 Views</h3>
                <ul style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Kanban:</strong> Visualize your workflow. Drag and drop cards between "To Do", "In Progress", and "Done". Moving a task to "Done" automatically completes all its sub-tasks.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Timeline:</strong> A temporal view of your tasks from creation to deadline. The <span style={{color: '#ff4757', fontWeight: 'bold'}}>red vertical line</span> indicates the current day.</li>
                    <li style={{ marginBottom: '12px' }}><strong>List:</strong> A professional tabular view of all active tasks, sorted by urgency and due date.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Wiki:</strong> A fully-featured documentation reader with rich Markdown support.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🖱️ Interactions</h3>
                <ul style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Double Click:</strong> Opens the <strong>Edit Task</strong> dialog to modify deadlines, priority, or sub-tasks.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Right Click:</strong> Opens a <strong>Context Menu</strong> with options to Edit (GUI), Edit Text (Note), or Delete the task.</li>
                    <li style={{ marginBottom: '12px' }}><strong>(+) Button:</strong> Opens the <strong>New Task</strong> dialog. You can also create new projects directly from there.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Project Filter:</strong> Use the dropdown in the header to focus on a specific project or view "All Tasks".</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🏗️ Advanced Sub-tasks</h3>
                <p>Manage complex tasks with 6-level nested hierarchies directly from the Task Dialog or Kanban cards.</p>
                
                <h4 style={{ marginTop: '15px', color: 'var(--text-color)', fontSize: '1.1rem' }}>Hierarchical Drag & Drop:</h4>
                <ul style={{ paddingLeft: '25px', marginTop: '10px' }}>
                    <li style={{ marginBottom: '8px' }}><strong>Reorder:</strong> Drag items <strong>above</strong> or <strong>below</strong> others to reorder them as siblings.</li>
                    <li style={{ marginBottom: '8px' }}><strong>Nest:</strong> Drag an item <strong>onto the middle</strong> of another task (highlighted box) to make it a child (sub-task).</li>
                    <li style={{ marginBottom: '8px' }}><strong>Smart Placement:</strong> 
                        <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                            <li>New items are always appended to the end of the parent's block (keeping families together).</li>
                            <li><strong>Max Depth:</strong> Nesting is limited to 6 levels. Attempting to nest deeper will force the item to be a sibling.</li>
                            <li><strong>Break Out:</strong> Dropping an item <strong>below</strong> a max-level task will automatically reset it to the Root level, allowing you to easily exit deep indentation.</li>
                        </ul>
                    </li>
                </ul>

                <h4 style={{ marginTop: '15px', color: 'var(--text-color)', fontSize: '1.1rem' }}>Smart Checkboxes (Cascading Logic):</h4>
                <ul style={{ paddingLeft: '25px', marginTop: '10px' }}>
                    <li style={{ marginBottom: '8px' }}><strong>Check Parent:</strong> Automatically checks <strong>all nested sub-tasks</strong> (convenience).</li>
                    <li style={{ marginBottom: '8px' }}><strong>Uncheck Child:</strong> Automatically unchecks <strong>all parent tasks</strong> up to the root (safety: a parent cannot be done if a child isn't).</li>
                    <li style={{ marginBottom: '8px' }}><strong>Independent Uncheck:</strong> Unchecking a parent does <strong>NOT</strong> uncheck children (preserves your progress on sub-items).</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🚦 Sorting Logic</h3>
                <p>Tasks in all views are consistently ordered by:</p>
                <ol style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Due Date:</strong> Most urgent deadlines first.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Priority:</strong> High 🔴 &gt; Normal 🟠 &gt; Low 🔵.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Creation Date:</strong> Oldest tasks first (for same deadline/priority).</li>
                </ol>
                <p style={{ marginTop: '15px' }}><strong>Note on "Done" column:</strong> To keep the board clean, tasks completed more than <strong>30 days ago</strong> are automatically hidden from the "Done" column. The counter in the column header shows "Visible / Total" tasks.</p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>⏰ Overdue Tasks</h3>
                <p>Tasks that have passed their deadline and are not yet completed are highlighted with a <strong>semi-transparent red background</strong> in all views (Kanban cards, Timeline rows, and List items) to signal urgency.</p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🔄 Data Sync</h3>
                <p>The dashboard stays automatically synchronized with your Joplin data:</p>
                <ul style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>External Updates:</strong> Any change made to a note (content, tags, checkboxes) is detected and reflected in the dashboard.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Periodic Polling:</strong> The dashboard re-fetches all data every <strong>3 seconds</strong> to ensure perfect consistency even if an event is missed.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>📖 Wiki Features</h3>
                <p>The Wiki view transforms your project notes into a browsable documentation site.</p>
                <ul style={{ paddingLeft: '25px', marginTop: '10px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Rich Content:</strong> Supports <strong>GFM Tables</strong>, <strong>Task Lists</strong>, and <strong>Code Snippets</strong> with adaptive syntax highlighting.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Navigation:</strong> Use the collapsible sidebar to navigate between folders and notes. The layout is responsive.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Theme Integration:</strong> Automatically adapts to your Joplin theme (Light/Dark), ensuring code blocks and headers always look perfect.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px', borderTop: '1px solid var(--joplin-divider-color)', paddingTop: '20px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🛠️ Advanced: Custom Wiki Templates</h3>
                <p>This feature allows you to enforce a standardized structure for every new project. By defining a <strong>JSON template</strong>, you can automatically generate a hierarchy of notebooks and documentation pages, whenever a project is created.</p>
                
                <h4 style={{ marginTop: '15px', color: 'var(--text-color)' }}>Structure Definition</h4>
                <p>The template defines a tree of nodes. Each node represents either a <strong>Notebook (Folder)</strong> or a <strong>Note</strong>. The system distinguishes them based on the properties you provide.</p>

                <p style={{ marginTop: '10px', fontStyle: 'italic', opacity: 0.9, borderLeft: '3px solid var(--joplin-selected-color)', paddingLeft: '10px' }}>
                    <strong>Tip:</strong> You can set a <strong>Default Template</strong> in the plugin settings (<em>Tools &gt; Options &gt; Projects</em>) to be applied to all new projects. Alternatively, you can provide a custom JSON template during the creation of a specific project for a one-off structure.
                </p>

                <ul style={{ paddingLeft: '25px', marginTop: '10px' }}>
                    <li style={{ marginBottom: '8px' }}><strong>Common Property:</strong>
                        <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                            <li><code>"name"</code> <span style={{fontSize: '0.85rem', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', padding: '0 4px'}}>REQUIRED</span>: The title of the notebook or note.</li>
                        </ul>
                    </li>
                    <li style={{ marginBottom: '8px' }}><strong>Notebook Node:</strong>
                        <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                            <li>Must define <code>"children"</code>: An array of sub-nodes (recursive structure).</li>
                            <li>Cannot contain <code>"content"</code> or <code>"is_todo"</code>.</li>
                        </ul>
                    </li>
                    <li style={{ marginBottom: '8px' }}><strong>Note Node:</strong>
                        <ul style={{ paddingLeft: '20px', marginTop: '5px' }}>
                            <li>Must define <code>"content"</code>: An array of strings, where each string represents a line of text in the note body. Useful for pre-filling templates or checklists.</li>
                            <li>Optional <code>"is_todo"</code>: Boolean (<code>true</code>/<code>false</code>). If true, the note is created as a Joplin To-Do. Defaults to false.</li>
                            <li>Cannot contain <code>"children"</code>.</li>
                        </ul>
                    </li>
                </ul>

                <h4 style={{ marginTop: '15px', color: 'var(--text-color)' }}>Template Example</h4>
                <pre style={{ margin: 0 }}>
                    <code ref={codeRef} className="language-json">
                        {exampleJson}
                    </code>
                </pre>
            </section>
        </div>
    );
};

export default InfoView;