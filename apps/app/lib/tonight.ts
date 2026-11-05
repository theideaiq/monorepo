/**
 * A2, Tonight's pick: one game or film from the Store each day, the same for
 * everyone that day (by Baghdad's date) and different the next. It only
 * picks from what's in stock with a cover; nothing is written about it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Baghdad is UTC+3 all year. */
const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Days since 1970 in Baghdad. */
export const baghdadDayNumber = (now: Date) =>
  Math.floor((now.getTime() + BAGHDAD_OFFSET_MS) / DAY_MS);

/** Today's item from `items` (in a stable order), or null when empty. */
export const pickOfTheDay = <Item extends { id: string }>(
  items: readonly Item[],
  now = new Date()
): Item | null => {
  if (items.length === 0) {
    return null;
  }
  const ordered = [...items].sort((a, b) => a.id.localeCompare(b.id));
  return ordered[baghdadDayNumber(now) % ordered.length] ?? null;
};
