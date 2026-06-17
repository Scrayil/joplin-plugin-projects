# Changelog

[v1.5.0] - 17/06/26
### ✨ Features & Enhancements
- Wiki: internal note links now scroll to the target note within the wiki, or open it in the editor when it lives elsewhere.
- Wiki: resource and note links are prefixed with type icons (video, audio, PDF, generic file) using Font Awesome with an emoji fallback.
- Wiki: checkbox toggles in a rendered note are saved back to the source note.
- Wiki: the reading area flows to the available width, with wide elements scrolling inside their own box.
- Timeline: opens centered on today, re-measures on resize, and clicking a task row scrolls its bar into view (useful for overdue tasks before today).
- Dashboard: switching tabs preserves each view's scroll position and state, resetting only when the dashboard is reopened from a hidden state.
- Dashboard: the sort, urgency, and project controls are disabled in views where they have no effect, and the sort labels were decluttered.
- Subtasks: the nested completion cascade is reflected instantly across all views, and the Edit dialog marks completed subtasks.
- The task title is now editable in the GUI Edit dialog.
- Urgency levels are centralized (High/Medium/Low), removing the leftover "normal" level.

### 🐛 Bug Fixes
- Subtask completion is preserved through GUI edits and dependency-driven rescheduling, which previously reset checkboxes and flattened nesting.
- Re-nesting in the dialog normalizes the hierarchy, so a completed parent above an incomplete child is cleared.
- The Kanban "Expand Subtasks" overlay no longer passes clicks through to cards behind it or hijacks card drag.
- Rendering wiki note links no longer floods the console with "No such resource" errors.
- Sorting is deterministic, so toggling a subtask no longer reshuffles cards.

[v1.4.0] - 16/06/26
### ✨ Features & Enhancements
- Reworked the Timeline into a professional, interactive Gantt chart.
- Added task **Start Date** support, with start-to-due bars and sorting by start date.
- Added **task dependencies** (Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish), created by dragging between task handles and drawn with clean orthogonal arrows.
- Added **Critical Path** highlighting (toggle) to show the longest dependency chain per project.
- Drag to move and resize task bars with day snapping, a live date tooltip, and an in-bar progress indicator (share of completed subtasks).
- Added **milestones**, shown as diamonds for zero-duration tasks.
- Dependent tasks are automatically rescheduled when a linked task is moved.
- Colors now adapt dynamically to the active Joplin theme across every view (Kanban, Timeline, List, Wiki).

### 🐛 Bug Fixes
- Invalid dependencies (self, cross-project, circular, or schedule-conflicting links) are now prevented with clear messages.
- Removed connector-line and snap-back glitches when editing the timeline, and made interactions feel instant across all views.

[v1.3.0] - 11/02/26
### ✨ Features & Enhancements
- Added an 'Urgent Only' toggle to filter Overdue and Approaching tasks.
- Implemented 'Approaching Deadline' logic with a configurable 1-100 day threshold.
- Updated visual styling for Overdue (Red) and Approaching (Orange) tasks across Kanban, Timeline, and List views.
- Added a continuous integration workflow for automated prerelease generation.
- Finalized nested subtasks with robust drag-and-drop rules for up to 6 levels.
- Added visual drag handles to sub-task items for better UX.
- Refactored cascading completion logic to correctly handle parent/child checkbox states.
- Enhanced Kanban card UI with horizontal scroll for deep nesting, hanging indents for wrapped text, and title line clamping.
- Rendered subtasks as Markdown with sanitized HTML.
- Standardized interactions across views using double-click to edit and right-click for a new context menu.
- Implemented a `TaskContextMenu` with options for GUI Edit, Text Edit, and Delete.
- Improved link handling by automatically converting plain text URLs to Markdown links upon task creation.
- Forced links to open in the system's default external browser.
- Pre-selected the currently filtered project when opening the "New Task" dialog.

### 🐛 Bug Fixes
- Fixed subtask completion reset behavior so they are only unchecked when a task is moved out of the "Done" column.
- Implemented debounce logic to prevent double-opening of dialogs.

### 🔒 Security
- Mitigated XSS vulnerabilities in WikiView by sanitizing Markdown HTML output using DOMPurify.
- Eliminated DOM XSS risks in subtask rendering by rewriting the task dialog script to use `textContent` and secure DOM creation methods.

### 🧹 Chores & Documentation
- Updated InfoView and README documentation with new features and interaction patterns.
- Added missing docstrings and improved overall documentation.

[v1.2.0] - 14/01/26
- Added a new Wiki view in the dashboard with multimedia support for Joplin resources.
- Implemented custom project wiki structures based on JSON templates with validation logic.
- Added a self-healing mechanism to automatically recreate deleted Task folders.
- Added a toolbar button and keyboard shortcut to toggle the dashboard.
- Improved GUI responsiveness, contrast/theming, and added horizontal scrollbars for small panels.
- Refactored dashboard API calls into a dedicated database service for better performance and maintainability.
- Fixed layout issues with due dates on short timelines.
- Fixed a bug where numeric IDs could cause NaN due dates.
- Fixed trailing space handling when toggling checkboxes in Kanban view.
- Various UI improvements: Kanban card hover titles, font resizing, and improved info view documentation.

[v1.1.1] - 02/01/26
- Fixed a bug where updating tasks via the dashboard would overwrite the corresponding note content deleting eventual manually user-added descriptions.
- Fixed an issue where checking off a task could incorrectly toggle other tasks with similar names (e.g., "Buy Water" vs "Buy Water and Bread").

[v1.1.0] - 01/01/26
- Added multi-device support (Anchor-Note)

[v1.0.0] - 01/01/26
- Initial release