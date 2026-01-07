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
        const lines = body.split('\n');
        const escapedTitle = subTaskTitle.replace(/[.*+?^${}()|[\\]/g, '\\$&');
        // Added $ anchor to ensure we match the exact task title and not a prefix
        const regex = new RegExp(`^(\\s*-\\s*\\[)([ xX])(\\]\\s*${escapedTitle})\\s*$`);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(regex);
            
            if (match) {
                const newMark = checked ? 'x' : ' ';
                lines[i] = line.replace(regex, `$1${newMark}$3`);
                return lines.join('\n');
            }
        }
        return body; // Return original body if no match found
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
     * Replaces existing subtasks in the note body with a new list of subtasks,
     * attempting to preserve the original layout (newlines, context) as much as possible.
     */
    public updateNoteBodyWithSubTasks(currentBody: string, newSubTasks: string[]): string {
        const lines = currentBody.split('\n');
        const checkboxRegex = /^\s*-\s*\[([ xX])\]\s*(.*)$/;
        
        const existingTasks: { lineIndex: number; title: string; originalLine: string }[] = [];
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(checkboxRegex);
            if (match) {
                existingTasks.push({
                    lineIndex: i,
                    title: match[2].trim(),
                    originalLine: lines[i]
                });
            }
        }

        if (existingTasks.length === 0) {
            const newLines = newSubTasks.map(st => `- [ ] ${st}`);
            if (currentBody.trim().length > 0) {
                return currentBody + '\n\n' + newLines.join('\n');
            } else {
                return newLines.join('\n');
            }
        }

        const keptExistingIndices = new Set<number>();
        const insertions = new Map<number, string[]>();
        
        let lastMatchedExistingIndex = -1;
        let currentExistingSearchIdx = 0;

        const initialInsertions: string[] = [];
        let collectingInitial = true;

        for (const newTaskTitle of newSubTasks) {
            let found = false;
            
            for (let i = currentExistingSearchIdx; i < existingTasks.length; i++) {
                if (existingTasks[i].title === newTaskTitle) {
                    keptExistingIndices.add(existingTasks[i].lineIndex);
                    lastMatchedExistingIndex = existingTasks[i].lineIndex;
                    currentExistingSearchIdx = i + 1;
                    found = true;
                    collectingInitial = false;
                    break;
                }
            }

            if (!found) {
                if (collectingInitial) {
                    initialInsertions.push(newTaskTitle);
                } else {
                    if (!insertions.has(lastMatchedExistingIndex)) {
                        insertions.set(lastMatchedExistingIndex, []);
                    }
                    insertions.get(lastMatchedExistingIndex)!.push(newTaskTitle);
                }
            }
        }

        const resultLines: string[] = [];
        const existingLineIndices = new Set(existingTasks.map(t => t.lineIndex));
        let initialInsertionsFlushed = false;
        
        for (let i = 0; i < lines.length; i++) {
            const isCheckbox = existingLineIndices.has(i);

            if (!isCheckbox) {
                resultLines.push(lines[i]);
            } else {
                if (keptExistingIndices.has(i)) {
                    if (!initialInsertionsFlushed && initialInsertions.length > 0) {
                         initialInsertions.forEach(t => resultLines.push(`- [ ] ${t}`));
                         initialInsertionsFlushed = true;
                    }

                    resultLines.push(lines[i]);

                    if (insertions.has(i)) {
                        insertions.get(i)!.forEach(t => resultLines.push(`- [ ] ${t}`));
                    }
                } else {
                    if (!initialInsertionsFlushed && initialInsertions.length > 0) {
                         initialInsertions.forEach(t => resultLines.push(`- [ ] ${t}`));
                         initialInsertionsFlushed = true;
                    }
                }
            }
        }

        return resultLines.join('\n');
    }

    /**
     * Generates a markdown list of checkboxes from an array of string titles.
     */
    public createBodyFromSubTasks(subTasks: string[]): string {
        if (!subTasks || subTasks.length === 0) return "";
        return subTasks.map(st => `- [ ] ${st}`).join('\n');
    }
}