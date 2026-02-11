# Changelog

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