/**
 * Scheduling rules shared by the plugin backend and the dashboard panel.
 *
 * This module is pure: it imports nothing and performs no I/O, so both bundles can use it
 * and the panel can predict exactly what the backend will write.
 */

/**
 * The fields of a task that the scheduling rules read. Dates are in milliseconds since
 * the epoch; a missing or zero date means the date is not set.
 */
export interface SchedulableTask {
    id: string;
    startDate?: number;
    dueDate?: number;
    createdTime: number;
    dependsOn?: { id: string }[];
}

/**
 * The dates written for a single task by a move.
 */
export interface TaskDates {
    id: string;
    startDate: number;
    dueDate: number;
}

/**
 * Computes every date change caused by moving or resizing a task on the Timeline.
 *
 * The moved task receives the given dates. When its due date changes, every task that
 * depends on it, directly or transitively, is shifted by the same amount, whatever the
 * dependency type, so the relative schedule is preserved. A dependent's dates are
 * resolved the way the Timeline draws them: a missing start date falls back to the
 * creation time, a missing due date to the start date. Changing only the start date
 * moves no dependent. Each task appears at most once, so circular dependencies
 * terminate.
 *
 * @param tasks Every task that may take part in the move, with its dates before the move.
 * @param movedId The ID of the task that was moved or resized.
 * @param startDate The new start date of the moved task.
 * @param dueDate The new due date of the moved task.
 * @returns The moved task first, then its dependents in depth-first order. Empty when
 *   movedId is not among the tasks.
 */
export function computeTaskMove(tasks: readonly SchedulableTask[], movedId: string, startDate: number, dueDate: number): TaskDates[] {
    const moved = tasks.find(t => t.id === movedId);
    if (!moved) return [];

    const changes: TaskDates[] = [{ id: movedId, startDate, dueDate }];
    const deltaMs = dueDate - (moved.dueDate || 0);
    if (deltaMs === 0) return changes;

    const visited = new Set<string>([movedId]);

    /**
     * Appends the shifted dates of every unvisited task depending on the given one, then
     * recurses into each of them.
     * @param sourceId The ID of the task whose dependents are shifted.
     */
    const shiftDependents = (sourceId: string): void => {
        for (const target of tasks) {
            if (visited.has(target.id)) continue;
            if (!target.dependsOn || !target.dependsOn.some(d => d.id === sourceId)) continue;
            visited.add(target.id);

            const targetStart = target.startDate || target.createdTime;
            const targetDue = target.dueDate || targetStart;
            changes.push({
                id: target.id,
                startDate: targetStart > 0 ? targetStart + deltaMs : targetStart,
                dueDate: targetDue > 0 ? targetDue + deltaMs : targetDue,
            });

            shiftDependents(target.id);
        }
    };
    shiftDependents(movedId);

    return changes;
}
