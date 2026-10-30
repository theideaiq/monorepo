/**
 * Bulbs, The IDEA Pass rewards: 1 Bulb = 100 IQD. Everyone earns the same
 * rate; The IDEA Plus plans earn more (`my_bulbs()`).
 */

/**
 * The Pass card's look: pink with the yellow bulb for everyone, a darker
 * finish for The IDEA Plus members.
 */
export const cardBackground = (plus: boolean) =>
  plus
    ? "bg-[radial-gradient(120%_90%_at_10%_0%,#4a3a12_0%,#1f1a10_45%,#0f1014_100%)]"
    : "bg-[radial-gradient(120%_90%_at_10%_0%,#f0507f_0%,#d81b60_45%,#8f0f3f_100%)]";
