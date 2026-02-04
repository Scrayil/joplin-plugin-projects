export interface SubTask {
    title: string;
    completed: boolean;
    level: number;
    originalIndex: number;
}

export class NoteParser {
    
    /**
     * Extracts checkbox items from the note body to represent subtasks, preserving hierarchy.
     * @param body The raw markdown content of the note.
     * @returns Array of subtask objects containing title, completion status, and nesting level.
     */
    public parseSubTasks(body: string): SubTask[] {
        const subTasks: SubTask[] = [];
        if (!body) return subTasks;

        const lines = body.split('\n');
        // Regex to capture indentation, checkbox state, and title
        const regex = /^(\s*)-\s*\[([ xX])\]\s*(.*)$/;

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(regex);
            if (match) {
                const indent = match[1];
                let spaceCount = 0;
                // Normalize indentation: count tabs as 4 spaces
                for (const char of indent) {
                    if (char === '\t') spaceCount += 4;
                    else spaceCount += 1;
                }
                
                // Use 2 spaces as the unit for 1 indentation level (standard for many editors including Joplin's default list behavior)
                const level = Math.floor(spaceCount / 2);

                subTasks.push({
                    title: match[3].trim(),
                    completed: match[2].toLowerCase() === 'x',
                    level: level,
                    originalIndex: i
                });
            }
        }

        // Post-process: Normalize levels to ensure valid tree structure
        // (No gaps in hierarchy, e.g., cannot jump from Level 0 to Level 2)
        if (subTasks.length > 0) {
            subTasks[0].level = 0; // First item must be root
            for (let i = 1; i < subTasks.length; i++) {
                const prevLevel = subTasks[i - 1].level;
                // A task can be at most 1 level deeper than the previous one
                if (subTasks[i].level > prevLevel + 1) {
                    subTasks[i].level = prevLevel + 1;
                }
            }
        }

        return subTasks;
    }

    /**
     * Toggles the completion status of a specific subtask by its index.
     * Implements "Loose Hierarchy" logic:
     * - Checking a task checks all its descendants (convenience).
     * - Unchecking a task affects ONLY that task (safety).
     * - Child status NEVER affects parent status.
     */
    public updateSubTaskStatus(body: string, targetIndex: number, checked: boolean): string {
        const lines = body.split('\n');
        let tasks = this.parseSubTasks(body);
        
        if (targetIndex < 0 || targetIndex >= tasks.length) return body;

        // Apply change to target
        tasks[targetIndex].completed = checked;

        // 1. Cascade Down (Parent -> Children)
        // Only propagate if we are CHECKING the task. 
        if (checked) {
            for (let i = targetIndex + 1; i < tasks.length; i++) {
                if (tasks[i].level > tasks[targetIndex].level) {
                    tasks[i].completed = true;
                } else {
                    break; // Stop when we hit a sibling or parent
                }
            }
        }

        // 2. Cascade Up (Safety Uncheck)
        // If we are UNCHECKING a child, the parent cannot be considered done.
        // We traverse up and uncheck all parents.
        if (!checked) {
            let currentLevel = tasks[targetIndex].level;
            let currentIndex = targetIndex;

            while (currentLevel > 0) {
                // Find parent
                let parentIndex = -1;
                for (let i = currentIndex - 1; i >= 0; i--) {
                    if (tasks[i].level < currentLevel) {
                        parentIndex = i;
                        break;
                    }
                }

                if (parentIndex === -1) break;

                // Uncheck parent
                tasks[parentIndex].completed = false;

                // Move up
                currentIndex = parentIndex;
                currentLevel = tasks[parentIndex].level;
            }
        }

        // Reconstruct body
        const newLines = [...lines];
        for (const task of tasks) {
            const originalLine = lines[task.originalIndex];
            const indentMatch = originalLine.match(/^(\s*)-/);
            const prefix = indentMatch ? indentMatch[1] : '  '.repeat(task.level);
            const mark = task.completed ? 'x' : ' ';
            newLines[task.originalIndex] = `${prefix}- [${mark}] ${task.title}`;
        }

        return newLines.join('\n');
    }

    /**
     * Updates all subtasks (simple global toggle).
     */
    public updateAllSubTasks(body: string, completed: boolean): string {
        if (completed) {
            return body.replace(/- \[ \]/g, '- [x]');
        } else {
            return body.replace(/- \[[xX]\]/g, '- [ ]');
        }
    }

    /**
     * Replaces existing subtasks in the note body with a new list.
     * Handles complex replacement while preserving indentation.
     */
    public updateNoteBodyWithSubTasks(currentBody: string, newSubTasks: any[]): string {
        const lines = currentBody.split('\n');
        const checkboxRegex = /^\s*-\s*\[([ xX])\]\s*(.*)$/;
        
        let firstTaskLine = -1;
        let lastTaskLine = -1;

        for (let i = 0; i < lines.length; i++) {
            if (checkboxRegex.test(lines[i])) {
                if (firstTaskLine === -1) firstTaskLine = i;
                lastTaskLine = i;
            }
        }

        // Format new tasks to markdown
        const formattedNewTasks = newSubTasks.map(st => {
            // Handle both string array (legacy) and object array
            if (typeof st === 'string') {
                if (st.trim().startsWith('- [')) return st;
                 const match = st.match(/^(\s*)(.*)/);
                 const indent = match ? match[1] : '';
                 const title = match ? match[2] : st;
                 return `${indent}- [ ] ${title}`;
            } else {
                const indent = '  '.repeat(st.level || 0);
                const mark = st.completed ? 'x' : ' ';
                return `${indent}- [${mark}] ${st.title}`;
            }
        });

        if (firstTaskLine === -1) {
            if (currentBody.trim().length > 0) {
                return currentBody + '\n\n' + formattedNewTasks.join('\n');
            } else {
                return formattedNewTasks.join('\n');
            }
        } else {
            const before = lines.slice(0, firstTaskLine);
            const after = lines.slice(lastTaskLine + 1);
            return [...before, ...formattedNewTasks, ...after].join('\n');
        }
    }

    /**
     * Generates a markdown list from an array of strings or objects.
     */
    public createBodyFromSubTasks(subTasks: any[]): string {
        if (!subTasks || subTasks.length === 0) return "";
        return subTasks.map(st => {
             if (typeof st === 'string') {
                 if (st.trim().startsWith('- [')) return st;
                 const match = st.match(/^(\s*)(.*)/);
                 const indent = match ? match[1] : '';
                 const title = match ? match[2] : st;
                 return `${indent}- [ ] ${title}`;
             } else {
                const indent = '  '.repeat(st.level || 0);
                const mark = st.completed ? 'x' : ' ';
                return `${indent}- [${mark}] ${st.title}`;
             }
        }).join('\n');
    }
}