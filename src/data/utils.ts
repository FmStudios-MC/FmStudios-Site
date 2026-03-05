/** Format a date string (YYYY-MM-DD) as relative time, e.g. "3 months ago" */
export function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear >= 1) return diffYear === 1 ? '1 year ago' : `${diffYear} years ago`;
  if (diffMonth >= 1) return diffMonth === 1 ? '1 month ago' : `${diffMonth} months ago`;
  if (diffDay >= 7) {
    const weeks = Math.floor(diffDay / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (diffDay >= 1) return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
  if (diffHr >= 1) return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`;
  return 'Just now';
}

/** Estimate reading time in minutes from HTML content */
export function readingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const words = text.split(' ').length;
  return Math.max(1, Math.round(words / 200));
}

/** Format a date string (YYYY-MM-DD) as a readable date, e.g. "Feb 17, 2026" */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
