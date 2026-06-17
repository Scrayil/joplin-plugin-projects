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
                    <li style={{ marginBottom: '12px' }}><strong>Timeline (Gantt):</strong> An interactive Gantt chart spanning each task from its start date to its deadline. Reschedule by dragging, link tasks into dependencies, and highlight the critical path. The <span style={{color: 'var(--prj-today)', fontWeight: 'bold'}}>red vertical line</span> marks the current day. See the dedicated section below.</li>
                    <li style={{ marginBottom: '12px' }}><strong>List:</strong> A professional tabular view of all active tasks, ordered by the active sort criterion.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Wiki:</strong> A documentation reader with Markdown support, type-aware resource icons, and an inline media player.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🗓️ Timeline (Gantt)</h3>
                <p>The Timeline is a full interactive Gantt chart. Each task is drawn as a bar spanning from its <strong>Start Date</strong> to its <strong>Due Date</strong>, grouped by project.</p>
                <ul style={{ paddingLeft: '25px', marginTop: '10px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Reschedule by Dragging:</strong> Drag a bar to move it, or drag its left/right edge to resize it. Both update the task's start and due dates instantly.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Dependencies:</strong> Drag from a bar's start or end handle onto another task to link them. The dependency type (<code>FS</code>, <code>SS</code>, <code>FF</code>, <code>SF</code>) is derived from which handles you connect. Cross-project links and cycles are prevented automatically.</li>
                    <li style={{ marginBottom: '12px' }}><strong><span style={{ color: 'var(--prj-critical)', fontWeight: 'bold' }}>⬩ Critical Path:</span></strong> Toggle this to highlight the longest chain of linked tasks per project, the sequence that drives the project's end date.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Milestones:</strong> A task whose start and due dates are the same is rendered as a milestone <strong>diamond ◆</strong> instead of a bar.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Progress:</strong> Each bar is partially filled to reflect the task's completion (the share of its sub-tasks that are checked), with the matching percentage shown inside the bar. Tasks without sub-tasks (or with none completed yet) show no fill.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Navigation:</strong> The timeline opens centered on today. Jump with <em>⟸ First Task</em>, <em>⊙ Today</em>, and <em>Last Task ⟹</em>, and use <em>Zoom In/Out</em> to switch between <strong>Month</strong>, <strong>Week</strong>, and <strong>Day</strong> scales. <strong>Click a task row</strong> to scroll its bar into view, useful for reaching overdue tasks whose bars sit before today.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🖱️ Interactions</h3>
                <ul style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Double Click:</strong> Opens the <strong>Edit Task</strong> dialog to modify the title, start and due dates, priority, and sub-tasks.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Right Click:</strong> Opens a <strong>Context Menu</strong> with options to Edit (GUI), Edit Text (Note), Delete the task, or Expand Subtasks (a read-only collapsible view of the sub-task tree).</li>
                    <li style={{ marginBottom: '12px' }}><strong>(+) Button:</strong> Opens the <strong>New Task</strong> dialog. You can also create new projects directly from there.</li>
                    <li style={{ marginBottom: '12px' }}><strong>(🚨) Urgent Toggle:</strong> Filters the view to show <strong>ONLY</strong> tasks that are Overdue or Approaching a deadline.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Project Filter:</strong> Use the dropdown in the header to focus on a specific project or view "All Tasks".</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🏗️ Advanced Sub-tasks</h3>
                <p>Manage complex tasks with up to 6 levels of nested sub-tasks. Build and reorganize the hierarchy with drag &amp; drop in the <strong>New / Edit Task</strong> dialog, using a collapsible tree view. From a Kanban card, the context-menu <strong>Expand Subtasks</strong> action opens a Fullscreen Overlay (⤢), a <strong>read-only</strong> collapsible view for inspecting large trees.</p>

                <h4 style={{ marginTop: '15px', color: 'var(--text-color)', fontSize: '1.1rem' }}>Hierarchical Drag &amp; Drop (in the Task dialog):</h4>
                <p style={{ marginBottom: '10px', opacity: 0.9 }}>Use the drag handles (<span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>⋮⋮</span>) to easily grab and move items.</p>
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
                <p style={{ marginBottom: '10px', opacity: 0.9 }}>Toggling a checkbox on a card or in the overlay updates the whole hierarchy <strong>instantly</strong>, with no refresh delay:</p>
                <ul style={{ paddingLeft: '25px', marginTop: '10px' }}>
                    <li style={{ marginBottom: '8px' }}><strong>Check Parent:</strong> Automatically checks <strong>all nested sub-tasks</strong> (convenience).</li>
                    <li style={{ marginBottom: '8px' }}><strong>Uncheck Child:</strong> Automatically unchecks <strong>all parent tasks</strong> up to the root (safety: a parent cannot be done if a child isn't).</li>
                    <li style={{ marginBottom: '8px' }}><strong>Independent Uncheck:</strong> Unchecking a parent does <strong>NOT</strong> uncheck children (preserves your progress on sub-items).</li>
                    <li style={{ marginBottom: '8px' }}><strong>Re-nesting:</strong> When you change the hierarchy in the dialog, completion is preserved per item and the rules are re-applied, so a parent left complete above an incomplete child is automatically cleared.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>🚦 Sorting</h3>
                <p>Use the <strong>Sort</strong> dropdown in the header to order tasks consistently across the task views. Available criteria:</p>
                <ul style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Due Date</strong> (default): Earliest deadline first; ties are broken by priority.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Start Date:</strong> Earliest start first (falling back to the creation date when no start is set).</li>
                    <li style={{ marginBottom: '12px' }}><strong>Priority:</strong> High 🔴 &gt; Medium 🟠 &gt; Low 🔵.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Created Time:</strong> Newest tasks first.</li>
                </ul>
                <p style={{ marginTop: '15px', opacity: 0.9 }}>Sorting, the urgency filter, and the project filter only apply where they have an effect: the sort and urgency controls are disabled in the <strong>Wiki</strong> and <strong>Guide</strong> tabs, and the project filter is disabled in the <strong>Guide</strong> tab. They re-enable automatically when you return to a compatible view.</p>
                <p style={{ marginTop: '15px' }}><strong>Note on "Done" column:</strong> To keep the board clean, tasks completed more than <strong>30 days ago</strong> are automatically hidden from the "Done" column. The counter in the column header shows "Visible / Total" tasks.</p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--text-color)', fontSize: '1.4rem' }}>⏰ Urgency & Deadlines</h3>
                <p>The dashboard helps you stay on top of deadlines with visual cues in all views (Kanban, Timeline, List):</p>
                <ul style={{ paddingLeft: '25px', marginTop: '10px' }}>
                    <li style={{ marginBottom: '8px' }}><span style={{ color: 'var(--prj-overdue)', fontWeight: 'bold' }}>Red (Overdue):</span> Tasks that have passed their due date and are not yet completed.</li>
                    <li style={{ marginBottom: '8px' }}><span style={{ color: 'var(--prj-approaching)', fontWeight: 'bold' }}>Orange (Approaching):</span> Tasks due soon. The warning threshold is configurable in the plugin settings (default: 7 days).</li>
                </ul>
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
                    <li style={{ marginBottom: '12px' }}><strong>Internal Links:</strong> Click a link to another note to scroll straight to it within the Wiki, or open it in the editor when it lives outside the current project.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Resource Icons:</strong> Links to attachments are prefixed with a type icon (video 🎬, audio 🎵, PDF 📕, or a generic file 📎), and notes are marked too, so you can tell what each link points to.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Inline Media:</strong> Video and audio attachments open directly in an embedded player, without leaving the dashboard.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Live Checkboxes:</strong> Ticking a checkbox in a rendered note is saved back to the source note.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Navigation &amp; Layout:</strong> Use the collapsible sidebar to browse folders and notes; the reading area adapts fluidly to the available width and reclaims space when the sidebar is hidden.</li>
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
                            <li><code>"name"</code> <span style={{fontSize: '0.85rem', color: 'var(--prj-overdue)', border: '1px solid var(--prj-overdue)', borderRadius: '4px', padding: '0 4px'}}>REQUIRED</span>: The title of the notebook or note.</li>
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