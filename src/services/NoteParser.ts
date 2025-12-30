export class NoteParser {
    
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

    public updateSubTaskStatus(body: string, subTaskTitle: string, checked: boolean): string {
        // Regex to match the specific subtask line
        const escapedTitle = subTaskTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Correctly escaped regex for new RegExp()
        const regex = new RegExp(`^(\\s*-\s*\[)([ xX])(\]\\s*${escapedTitle}\\s*)$`, 'm');
        
        const match = body.match(regex);
        if (match) {
            const newMark = checked ? 'x' : ' ';
            return body.replace(regex, `$1${newMark}$3`);
        }
        return body;
    }

    public updateAllSubTasks(body: string, completed: boolean): string {
        if (completed) {
            return body.replace(/- \[ \]/g, '- [x]');
        } else {
            return body.replace(/- \[[xX]\]/g, '- [ ]');
        }
    }

    public createBodyFromSubTasks(subTasks: string[]): string {
        if (!subTasks || subTasks.length === 0) return "";
        return subTasks.map(st => `- [ ] ${st}`).join('\n');
    }
}
