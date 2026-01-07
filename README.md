# Joplin Projects Plugin

[![GPL V2 License](https://img.shields.io/badge/License-GPL_V2-blue.svg)](LICENSE)

An advanced project management plugin for Joplin that transforms your notes into a powerful, visual, and interactive task dashboard. Organize, track, and manage your projects with Kanban, Timeline, and List views, all seamlessly integrated within the Joplin environment.

![Plugin Screenshot](https://github.com/Scrayil/joplin-plugin-projects/blob/main/assets/promo.png)

## ✨ Features

- **Project-Based Organization**: Group your notes and tasks into distinct projects, each with its own folder structure.
- **Multiple Views**: Switch between different perspectives to manage your work effectively:
  - **Kanban Board**: A drag-and-drop interface to move tasks between "To Do", "In Progress", and "Done" columns.
  - **Timeline View**: A chronological, Gantt-style chart that visualizes task durations and deadlines.
  - **List View**: A clean, sortable table of all your tasks, prioritized by due date and urgency.
  - **Wiki View**: Browse and read project documentation with rich Markdown support.
- **Interactive Dashboard**: A central hub to visualize and interact with all your tasks from every project.
- **Smart Task Recognition**: Any to-do note inside a project's dedicated "Tasks" folder is automatically picked up by the dashboard.
- **Sub-task Management**: Create and toggle sub-tasks (markdown checkboxes) directly from the Kanban board or edit dialog.
- **Seamless Integration**: Uses Joplin's native to-dos, tags, and folders. Your data remains in the standard Joplin format.
- **Automatic Sync**: The dashboard stays in sync with your notes in real-time.

## 🚀 Getting Started

### Installation

1.  Open Joplin and navigate to `Tools` > `Options` > `Plugins`.
2.  Search for "Projects" and click "Install".
3.  Restart Joplin to complete the installation.

### Usage

#### 1. Create Your First Project

The plugin organizes everything under a main `🗂️ Projects` folder.

To create a new project:
- Click on `Tools` > `Create a new project`.
- Or use the shortcut `Ctrl+N`.

This will open a dialog where you can name your project and assign an icon. A new notebook with your project name will be created inside the `🗂️ Projects` folder, populated with a default structure including a crucial **Tasks** sub-folder.

#### 2. Add Tasks

A **Task** is simply a Joplin **to-do note**. For the plugin to recognize a task, it must be created inside the `Tasks` sub-folder of any of your projects.

#### 3. Open the Dashboard

You can open the dashboard in several ways:
- **Note Toolbar**: Click the folder icon (`fas fa-folder-open`) in the note toolbar.
- **Menu**: Go to `View` > `Toggle Project Dashboard`.
- **Shortcut**: Press `Ctrl+Alt+P`.

### The Dashboard Views

The dashboard is the heart of the plugin and provides several ways to look at your tasks.

#### Kanban Board
- **Visualize Workflow**: See all your tasks as cards in "To Do", "In Progress", and "Done" columns.
- **Update Status**: Simply drag and drop a card from one column to another to update its status. Moving a task to "In Progress" adds an `In Progress` tag. Moving it to "Done" marks the to-do as completed and checks off all its sub-tasks.
- **Interactions**:
  - **Single-Click**: Opens the task note in the Joplin editor.
  - **Double-Click**: Opens an edit dialog to change priority, due date, and sub-tasks.
  - **Check Sub-tasks**: Toggle sub-tasks directly from the card.

#### Timeline View
- **Visualize Deadlines**: See tasks plotted on a timeline based on their creation date and due date. A red line indicates the current day.
- **Identify Overlaps**: Quickly see which tasks are running in parallel.
- **Interactions**: Single-click to open the note, double-click to edit.

#### List View
- **Get a Quick Overview**: A simple, powerful table showing all your active tasks.
- **Smart Sorting**: Tasks are automatically sorted by:
  1.  Due Date (most urgent first).
  2.  Priority (`High` > `Normal` > `Low`).
  3.  Creation Date (oldest first).
- **Interactions**: Single-click to open the note, double-click to edit.

#### Wiki View
- **Integrated Knowledge Base**: Browse and read project documentation directly within the dashboard.
- **Rich Rendering**: Full support for standard Markdown, including **Tables**, **Task Lists**, and syntax-highlighted **Code Snippets**.
- **Adaptive Interface**: Features a collapsible Table of Contents sidebar and a responsive reader that adapts to your theme (Light/Dark).
- **Offline Ready**: All rendering and highlighting libraries are bundled, ensuring full functionality even without an internet connection.

### Custom Wiki Templates

This plugin allows you to enforce a standardized structure for every new project using customizable JSON templates.  
Automatically generate a hierarchy of notebooks, folders, and pre-filled notes (like "Kickoff Checklist" or "Project Overview") whenever you create a project.

## 🎞️ Demo Video

[![Watch the demo](https://github.com/user-attachments/assets/fd28ce99-a501-4d46-b945-90af469d1ef8)](https://vimeo.com/1152146539?share=copy&fl=sv&fe=ci)

#### Learn More
For detailed instructions on how to structure your JSON templates and examples, please refer to the **Info** tab within the plugin's dashboard.

## Recent changes

- [Changelog](/CHANGELOG.md)

## My official plugins

[![Joplin Plugins](https://img.shields.io/badge/Joplin_Plugins-purple.svg)](https://joplinapp.org/plugins/?search=author%3D%22Mattia%20Bennati%20(Scrayil)%22%20max-results%3D20)

## 📄 License

Copyright 2026 Mattia Bennati  
Licensed under the GNU GPL V2: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html
