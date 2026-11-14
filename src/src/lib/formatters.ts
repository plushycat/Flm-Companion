/**
 * Utility functions for formatting data across the application
 */

/**
 * Format bytes to human readable size (MB, GB)
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const GB = 1024 * 1024 * 1024;
    const MB = 1024 * 1024;

    if (bytes >= GB) {
        return `${(bytes / GB).toFixed(1)}GB`;
    }
    return `${(bytes / MB).toFixed(0)}MB`;
}

/**
 * Format date string to localized date
 */
export function formatDate(dateString: string | undefined): string {
    if (!dateString || dateString === "-") return "-";

    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return dateString;
    }
}

/**
 * Format timestamp to localized time string
 */
export function formatTime(date: Date = new Date()): string {
    return date.toLocaleTimeString();
}

/**
 * Get CSS class for log line based on content
 */
export function getLogColorClass(log: string): string {
    if (log.includes("[ERROR]")) return "text-red-600 dark:text-red-400 font-medium";
    if (log.includes("[FLM]")) return "text-blue-700 dark:text-sky-400 font-medium";
    if (log.includes("[SYSTEM]")) return "text-amber-700 dark:text-amber-300 font-medium";
    return "text-zinc-800 dark:text-zinc-300";
}

/**
 * Format token count (e.g. 4096 -> 4K)
 */
export function formatTokenCount(value: number): string {
    if (value >= 1024 && value % 1024 === 0) {
        return `${value / 1024}K`;
    }
    return value.toLocaleString();
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + "...";
}
