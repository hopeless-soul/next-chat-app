/**
 * Format an ISO 8601 date string as a relative "last seen" label.
 */
export function formatLastSeen(iso: string | null): string {
  if (!iso) return 'a long time ago';
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay === 1) return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diffDay < 7) return `${diffDay} days ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Format an ISO string for display as a message timestamp.
 */
export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Return a label like "Today", "Yesterday", or "Jan 12" for a date separator.
 */
export function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Check if two ISO strings are on the same calendar day.
 */
export function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/**
 * Check if two messages are within 5 minutes of each other (for grouping).
 */
export function withinGroupWindow(earlier: string, later: string): boolean {
  return new Date(later).getTime() - new Date(earlier).getTime() < 5 * 60 * 1000;
}
