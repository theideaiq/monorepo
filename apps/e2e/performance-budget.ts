/**
 * The website's performance budget on a mid-range Android phone (A28),
 * checked by `tests/performance.spec.ts` on the home page, the store, a
 * product page, Plus and Club, in Arabic and English.
 *
 * The phone: a Galaxy A55-sized screen, the CPU four times slower than the
 * CI machine and Lighthouse's "slow 4G" network (150 ms round trip,
 * 1.6 Mbit/s down, 750 kbit/s up), the conditions Lighthouse uses for its
 * mobile score. Raise a number only with a reason in the pull request.
 */
export const MID_RANGE_ANDROID = {
  cpuSlowdown: 4,
  device: "Galaxy A55",
  network: {
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    latency: 150,
    offline: false,
    uploadThroughput: (750 * 1024) / 8,
  },
} as const;

export const budget = {
  /** Cumulative Layout Shift ("good" is 0.1 or less). */
  cls: 0.1,
  /**
   * JavaScript downloaded until the load event, compressed, in bytes. On
   * 2026-11-04 the pages took 375–435 KB (they took 825–890 KB before
   * Sentry, PostHog and the error page's messages stopped loading upfront).
   */
  jsBytes: 460_000,
  /** Largest Contentful Paint, in milliseconds ("good" is 2.5 s or less). */
  lcpMs: 2500,
  /**
   * Total Blocking Time: long tasks beyond 50 ms, summed, in milliseconds
   * ("good" is under 200 ms on Lighthouse's own phone; CI machines vary, so
   * the budget leaves room).
   */
  tbtMs: 600,
  /** Everything downloaded until the load event, compressed, in bytes. */
  totalBytes: 760_000,
} as const;
