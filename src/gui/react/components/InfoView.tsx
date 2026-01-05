import * as React from 'react';

/**
 * Renders the information/help tab, providing a guide on how to use the dashboard.
 */
const InfoView: React.FC = () => {
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
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🖱️ Interactions</h3>
                <ul style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Single Click:</strong> Instantly opens the corresponding note in the Joplin editor.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Double Click:</strong> Opens the <strong>Edit Task</strong> dialog to modify deadlines, priority, or sub-tasks.</li>
                    <li style={{ marginBottom: '12px' }}><strong>(+) Button:</strong> Opens the <strong>New Task</strong> dialog. You can also create new projects directly from there.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Project Filter:</strong> Use the dropdown in the header to focus on a specific project or view "All Tasks".</li>
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

            <section style={{ marginBottom: '30px', borderTop: '1px solid var(--joplin-divider-color)', paddingTop: '20px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🛠️ Advanced: Custom Wiki Templates</h3>
                <p>This feature allows you to enforce a standardized structure for every new project. By defining a <strong>JSON template</strong>, you can automatically generate a hierarchy of notebooks and documentation pages, whenever a project is created.</p>
                
                <h4 style={{ marginTop: '15px', color: 'var(--text-color)' }}>Structure Definition</h4>
                <p>The template defines a tree of nodes. Each node represents either a <strong>Notebook (Folder)</strong> or a <strong>Note</strong>. The system distinguishes them based on the properties you provide.</p>

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
                <pre style={{ 
                    background: 'var(--column-bg)', 
                    color: 'var(--text-color)',
                    padding: '15px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border-color)',
                    overflowX: 'auto',
                    fontSize: '0.9rem',
                    fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                    lineHeight: '1.5',
                    fontWeight: 'bold'
                }}>
                    <div>{'{'}</div>
                    <div style={{ paddingLeft: '20px' }}>
                        <span style={{color: 'var(--joplin-url-color)'}}>"name"</span>: <span style={{opacity: 0.8}}>"Project Wiki"</span>,
                    </div>
                    <div style={{ paddingLeft: '20px' }}>
                        <span style={{color: 'var(--joplin-url-color)'}}>"children"</span>: [
                    </div>
                    <div style={{ paddingLeft: '40px' }}>{'{'}</div>
                    <div style={{ paddingLeft: '60px' }}>
                        <span style={{color: 'var(--joplin-url-color)'}}>"name"</span>: <span style={{opacity: 0.8}}>"Home"</span>,
                    </div>
                    <div style={{ paddingLeft: '60px' }}>
                        <span style={{color: 'var(--joplin-url-color)'}}>"is_todo"</span>: <span style={{color: 'var(--joplin-color-warn)'}}>false</span>,
                    </div>
                    <div style={{ paddingLeft: '60px' }}>
                        <span style={{color: 'var(--joplin-url-color)'}}>"content"</span>: [
                    </div>
                    <div style={{ paddingLeft: '80px' }}>
                        <span style={{opacity: 0.8}}>"# Project Overview"</span>,
                    </div>
                    <div style={{ paddingLeft: '80px' }}>
                        <span style={{opacity: 0.8}}>"This note was auto-generated."</span>
                    </div>
                    <div style={{ paddingLeft: '60px' }}>]</div>
                    <div style={{ paddingLeft: '40px' }}>{'},'}</div>
                    <div style={{ paddingLeft: '40px' }}>{'{'}</div>
                    <div style={{ paddingLeft: '60px' }}>
                        <span style={{color: 'var(--joplin-url-color)'}}>"name"</span>: <span style={{opacity: 0.8}}>"Planning"</span>,
                    </div>
                    <div style={{ paddingLeft: '60px' }}>
                        <span style={{color: 'var(--joplin-url-color)'}}>"children"</span>: [
                    </div>
                    <div style={{ paddingLeft: '80px' }}>{'{'}</div>
                    <div style={{ paddingLeft: '100px' }}>
                        <span style={{color: 'var(--joplin-url-color)'}}>"name"</span>: <span style={{opacity: 0.8}}>"Kickoff Checklist"</span>,
                    </div>
                    <div style={{ paddingLeft: '100px' }}>
                        <span style={{color: 'var(--joplin-url-color)'}}>"is_todo"</span>: <span style={{color: 'var(--joplin-color-warn)'}}>true</span>,
                    </div>
                    <div style={{ paddingLeft: '100px' }}>
                        <span style={{color: 'var(--joplin-url-color)'}}>"content"</span>: [
                    </div>
                    <div style={{ paddingLeft: '120px' }}>
                        <span style={{opacity: 0.8}} >"- [ ] Define scope"</span>,
                    </div>
                    <div style={{ paddingLeft: '120px' }}>
                        <span style={{opacity: 0.8}}>"- [ ] Assign team"</span>
                    </div>
                    <div style={{ paddingLeft: '100px' }}>]</div>
                    <div style={{ paddingLeft: '80px' }}>{'}'}</div>
                    <div style={{ paddingLeft: '60px' }}>]</div>
                    <div style={{ paddingLeft: '40px' }}>{'}'}</div>
                    <div style={{ paddingLeft: '20px' }}>]</div>
                    <div>{'}'}</div>
                </pre>
            </section>
        </div>
    );
};

export default InfoView;
