/**
 * Formats a timestamp value into human-readable text
 * @param timestamp The timestamp to format.
 * @param includeTime Flag used to determine if time should be displayed in the formatted date
 */
export function formatDate(timestamp: number, includeTime = true) {
    const date = new Date(timestamp);

    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(includeTime && {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        })
    };

    return date.toLocaleDateString('en-GB', options).replace(/,/g, '');
}

/**
 * Maps task tags to a numeric priority value for sorting.
 * 1 = High, 2 = Normal/Medium, 3 = Low, 4 = None/Other
 */
export function getPriorityValue(tags: string[]) {
    if (tags.some(t => t.toLowerCase().includes('high'))) return 1;
    if (tags.some(t => t.toLowerCase().includes('normal') || t.toLowerCase().includes('medium'))) return 2;
    if (tags.some(t => t.toLowerCase().includes('low'))) return 3;
    return 4;
}
