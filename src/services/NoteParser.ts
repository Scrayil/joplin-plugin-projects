export class NoteParser {
    
    /**
     * Extracts checkbox items from the note body to represent subtasks.
     * @param body The raw markdown content of the note.
     * @returns Array of subtask objects containing title and completion status.
     */
    public parseSubTasks(body: string): { title: string; completed: boolean }[] {
        const subTasks: { title: string; completed: boolean }[] = [];
        if (!body) return subTasks;

        const lines = body.split('\n');
        const regex = /^\s*-\s*\[([ xX])\]\s*(.*)$/;

        for (const line of lines) {
            const match = line.match(regex);
            if (match) {
                subTasks.push({
                    completed: match[1].toLowerCase() === 'x',
                    title: match[2].trim()
                });
            }
        }
        return subTasks;
    }

    /**
     * Toggles the completion status of a specific subtask within the markdown body.
     */
    public updateSubTaskStatus(body: string, subTaskTitle: string, checked: boolean): string {
        const escapedTitle = subTaskTitle.replace(/[.*+?^${}()|[\\]/g, '\\$&');
        const regex = new RegExp(`^(\s*-\s*\[)([ xX])(\]\s*${escapedTitle}\s*)$`, 'm');
        
        const match = body.match(regex);
        if (match) {
            const newMark = checked ? 'x' : ' ';
            return body.replace(regex, `$1${newMark}$3`);
        }
        return body;
    }

    /**
     * Updates the status of all subtasks in the body to match the parent task's completion state.
     */
    public updateAllSubTasks(body: string, completed: boolean): string {
        if (completed) {
            return body.replace(/- \[ \]/g, '- [x]');
        } else {
            return body.replace(/- \[[xX]\]/g, '- [ ]');
        }
    }

    /**
     * Generates a markdown list of checkboxes from an array of string titles.
     */
    public createBodyFromSubTasks(subTasks: string[]): string {
        if (!subTasks || subTasks.length === 0) return "";
        return subTasks.map(st => `- [ ] ${st}`).join('\n');
    }
}