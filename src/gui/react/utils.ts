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
