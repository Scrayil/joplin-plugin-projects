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
                <h3 style={{ color: 'var(--joplin-selected-color)', fontSize: '1.4rem' }}>🗂️ Overview</h3>
                <p>This plugin helps you manage projects and tasks directly within Joplin. Tasks are identified as "To-do" notes located within the <strong>"Tasks"</strong> sub-folder of your project notebooks.</p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--joplin-selected-color)', fontSize: '1.4rem' }}>📋 Views</h3>
                <ul style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Kanban:</strong> Visualize your workflow. Drag and drop cards between "To Do", "In Progress", and "Done". Moving a task to "Done" automatically completes all its sub-tasks.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Timeline:</strong> A temporal view of your tasks from creation to deadline. The <span style={{color: '#ff4757', fontWeight: 'bold'}}>red vertical line</span> indicates the current day.</li>
                    <li style={{ marginBottom: '12px' }}><strong>List:</strong> A professional tabular view of all active tasks, sorted by urgency and due date.</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--joplin-selected-color)', fontSize: '1.4rem' }}>🖱️ Interactions</h3>
                <ul style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Single Click:</strong> Instantly opens the corresponding note in the Joplin editor.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Double Click:</strong> Opens the <strong>Edit Task</strong> dialog to modify deadlines, priority, or sub-tasks.</li>
                    <li style={{ marginBottom: '12px' }}><strong>(+) Button:</strong> Opens the <strong>New Task</strong> dialog. You can also create new projects directly from there.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Project Filter:</strong> Use the dropdown in the header to focus on a specific project or view "All Tasks".</li>
                </ul>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--joplin-selected-color)', fontSize: '1.4rem' }}>🚦 Sorting Logic</h3>
                <p>Tasks in all views are consistently ordered by:</p>
                <ol style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>Due Date:</strong> Most urgent deadlines first.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Priority:</strong> High 🔴 &gt; Normal 🟠 &gt; Low 🔵.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Creation Date:</strong> Oldest tasks first (for same deadline/priority).</li>
                </ol>
                <p style={{ marginTop: '15px' }}><strong>Note on "Done" column:</strong> To keep the board clean, tasks completed more than <strong>30 days ago</strong> are automatically hidden from the "Done" column. The counter in the column header shows "Visible / Total" tasks.</p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--joplin-selected-color)', fontSize: '1.4rem' }}>⏰ Overdue Tasks</h3>
                <p>Tasks that have passed their deadline and are not yet completed are highlighted with a <strong>semi-transparent red background</strong> in all views (Kanban cards, Timeline rows, and List items) to signal urgency.</p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h3 style={{ color: 'var(--joplin-selected-color)', fontSize: '1.4rem' }}>🔄 Data Sync</h3>
                <p>The dashboard stays automatically synchronized with your Joplin data:</p>
                <ul style={{ paddingLeft: '25px' }}>
                    <li style={{ marginBottom: '12px' }}><strong>External Updates:</strong> Any change made to a note (content, tags, checkboxes) is detected and reflected in the dashboard.</li>
                    <li style={{ marginBottom: '12px' }}><strong>Periodic Polling:</strong> The dashboard re-fetches all data every <strong>3 seconds</strong> to ensure perfect consistency even if an event is missed.</li>
                </ul>
            </section>
        </div>
    );
};

export default InfoView;
