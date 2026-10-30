/**
 * Seats still free at an event, or null when it has no capacity limit (or
 * the count hasn't loaded yet).
 */
export const seatsLeft = (
  capacity: number | null,
  attending: number | undefined
) =>
  capacity === null || attending === undefined
    ? null
    : Math.max(capacity - attending, 0);
