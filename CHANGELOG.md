# Changelog

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
