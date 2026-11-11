import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTaskMove } from '../src/utils/schedule.ts';

const DAY = 24 * 60 * 60 * 1000;

test('the moved task receives the new dates and nothing else moves without dependents', () => {
    const tasks = [
        { id: 'a', startDate: 1 * DAY, dueDate: 3 * DAY, createdTime: 0 },
        { id: 'b', startDate: 1 * DAY, dueDate: 3 * DAY, createdTime: 0 },
    ];
    assert.deepEqual(computeTaskMove(tasks, 'a', 2 * DAY, 4 * DAY), [
        { id: 'a', startDate: 2 * DAY, dueDate: 4 * DAY },
    ]);
});

test('dependents are shifted transitively by the due date delta', () => {
    const tasks = [
        { id: 'a', startDate: 1 * DAY, dueDate: 3 * DAY, createdTime: 0 },
        { id: 'b', startDate: 4 * DAY, dueDate: 6 * DAY, createdTime: 0, dependsOn: [{ id: 'a' }] },
        { id: 'c', startDate: 7 * DAY, dueDate: 9 * DAY, createdTime: 0, dependsOn: [{ id: 'b' }] },
    ];
    assert.deepEqual(computeTaskMove(tasks, 'a', 3 * DAY, 5 * DAY), [
        { id: 'a', startDate: 3 * DAY, dueDate: 5 * DAY },
        { id: 'b', startDate: 6 * DAY, dueDate: 8 * DAY },
        { id: 'c', startDate: 9 * DAY, dueDate: 11 * DAY },
    ]);
});

test('a dependent without dates falls back to its creation time, then to its start date', () => {
    const tasks = [
        { id: 'a', startDate: 1 * DAY, dueDate: 3 * DAY, createdTime: 0 },
        { id: 'b', createdTime: 10 * DAY, dependsOn: [{ id: 'a' }] },
    ];
    assert.deepEqual(computeTaskMove(tasks, 'a', 2 * DAY, 4 * DAY), [
        { id: 'a', startDate: 2 * DAY, dueDate: 4 * DAY },
        { id: 'b', startDate: 11 * DAY, dueDate: 11 * DAY },
    ]);
});

test('changing only the start date moves no dependent', () => {
    const tasks = [
        { id: 'a', startDate: 1 * DAY, dueDate: 3 * DAY, createdTime: 0 },
        { id: 'b', startDate: 4 * DAY, dueDate: 6 * DAY, createdTime: 0, dependsOn: [{ id: 'a' }] },
    ];
    assert.deepEqual(computeTaskMove(tasks, 'a', 2 * DAY, 3 * DAY), [
        { id: 'a', startDate: 2 * DAY, dueDate: 3 * DAY },
    ]);
});

test('circular dependencies terminate and shift each task once', () => {
    const tasks = [
        { id: 'a', startDate: 1 * DAY, dueDate: 2 * DAY, createdTime: 0, dependsOn: [{ id: 'c' }] },
        { id: 'b', startDate: 3 * DAY, dueDate: 4 * DAY, createdTime: 0, dependsOn: [{ id: 'a' }] },
        { id: 'c', startDate: 5 * DAY, dueDate: 6 * DAY, createdTime: 0, dependsOn: [{ id: 'b' }] },
    ];
    const changes = computeTaskMove(tasks, 'a', 2 * DAY, 3 * DAY);
    assert.deepEqual(changes.map(c => c.id), ['a', 'b', 'c']);
    assert.deepEqual(changes[2], { id: 'c', startDate: 6 * DAY, dueDate: 7 * DAY });
});

test('a task reached through two paths is shifted once', () => {
    const tasks = [
        { id: 'a', startDate: 1 * DAY, dueDate: 2 * DAY, createdTime: 0 },
        { id: 'b', startDate: 3 * DAY, dueDate: 4 * DAY, createdTime: 0, dependsOn: [{ id: 'a' }] },
        { id: 'c', startDate: 5 * DAY, dueDate: 6 * DAY, createdTime: 0, dependsOn: [{ id: 'a' }, { id: 'b' }] },
    ];
    const changes = computeTaskMove(tasks, 'a', 2 * DAY, 3 * DAY);
    assert.deepEqual(changes.map(c => c.id), ['a', 'b', 'c']);
});

test('an unknown task produces no change', () => {
    assert.deepEqual(computeTaskMove([], 'missing', 1, 2), []);
});

test('the input tasks are not mutated', () => {
    const tasks = [
        { id: 'a', startDate: 1 * DAY, dueDate: 3 * DAY, createdTime: 0 },
        { id: 'b', startDate: 4 * DAY, dueDate: 6 * DAY, createdTime: 0, dependsOn: [{ id: 'a' }] },
    ];
    const snapshot = structuredClone(tasks);
    computeTaskMove(tasks, 'a', 2 * DAY, 4 * DAY);
    assert.deepEqual(tasks, snapshot);
});
