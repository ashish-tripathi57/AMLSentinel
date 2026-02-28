/**
 * Formats an ISO date string for display in the alert queue table.
 * Example: "2024-01-15T10:30:00Z" → "15 Jan 2024, 10:30"
 * Returns '—' for empty/null input.
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Formats an ISO date string to a short date only (no time).
 * Example: "2024-01-15T10:30:00Z" → "15 Jan 2024"
 */
export function formatDateShort(isoString: string | null | undefined): string {
  if (!isoString) return '—';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formats an ISO date string as a human-readable relative time.
 * Examples: "just now", "5 minutes ago", "3 days ago", "2 months ago"
 * Returns '—' for empty/null/invalid input.
 */
export function formatRelativeTime(isoString: string | null | undefined): string {
  if (!isoString) return '—';

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`;
}

/**
 * Formats an ISO date string as relative time with an absolute date suffix.
 * Matches Verilix style: "3 days ago (1/10/24)"
 * Returns '—' for empty/null/invalid input.
 */
export function formatRelativeWithDate(isoString: string | null | undefined): { relative: string; absolute: string } {
  if (!isoString) return { relative: '—', absolute: '' };

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return { relative: '—', absolute: '' };

  const relative = formatRelativeTime(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear() % 100;
  const absolute = `(${month}/${day}/${year.toString().padStart(2, '0')})`;

  return { relative, absolute };
}
