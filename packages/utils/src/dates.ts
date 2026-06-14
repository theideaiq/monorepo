/**
 * Formats a raw UTC ISO string into a clean, human-readable date.
 * Locks the computation to the Asia/Baghdad timezone to ensure events 
 * and publication deadlines align perfectly with local reality.
 */
export function formatToLocalDate(isoString?: string | null): string {
  if (!isoString) return 'Unknown Date';

  const date = new Date(isoString);

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Formats a raw UTC ISO string into an exact timestamp with AM/PM.
 */
export function formatToLocalTimestamp(isoString?: string | null): string {
  if (!isoString) return 'Unknown Time';

  const date = new Date(isoString);

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Baghdad',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Calculates the exact days remaining until an event or submission deadline.
 */
export function getDaysRemaining(targetIsoString: string): number {
  const targetDate = new Date(targetIsoString).getTime();
  const currentDate = new Date().getTime();
  
  const diffInMilliseconds = targetDate - currentDate;
  const diffInDays = Math.ceil(diffInMilliseconds / (1000 * 60 * 60 * 24));
  
  return diffInDays > 0 ? diffInDays : 0;
}
