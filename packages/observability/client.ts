/*
 * Sentry in the browser (https://docs.sentry.io/platforms/javascript/guides/nextjs/).
 *
 * The SDK is the largest library on every page, so it is downloaded only
 * when a DSN is set, and Session Replay only once the page is idle: a phone
 * on a slow network gets the page first (A28, apps/e2e/performance-budget.ts).
 * Errors reported before the SDK arrives are sent once it has loaded.
 */
import { keys } from "./keys";

type SentryModule = typeof import("@sentry/nextjs");

let sentry: SentryModule | undefined;
let loading: Promise<SentryModule | undefined> | undefined;

const whenIdle = (callback: () => void) => {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 10_000 });
  } else {
    setTimeout(callback, 3000);
  }
};

/** Session Replay, downloaded once the page is idle. */
const addReplay = async (Sentry: SentryModule) => {
  try {
    const { replayIntegration } = await import("@sentry/replay");
    Sentry.addIntegration(
      replayIntegration({ blockAllMedia: true, maskAllText: true })
    );
  } catch {
    // Replay is optional; errors are still reported without it.
  }
};

const load = (): Promise<SentryModule | undefined> => {
  const dsn = keys().NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || typeof window === "undefined") {
    return Promise.resolve(undefined);
  }
  loading ??= (async () => {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      debug: false,
      dsn,
      enableLogs: true,
      integrations: [
        // Send console.log, console.error and console.warn as logs.
        Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
      ],
      replaysOnErrorSampleRate: 1,
      replaysSessionSampleRate: 0.1,
      tracesSampleRate: 1,
    });
    sentry = Sentry;
    whenIdle(() => addReplay(Sentry));
    return Sentry;
  })();
  return loading;
};

/** Starts Sentry in the background when a DSN is set. */
export const initializeSentry = (): void => {
  load().catch(() => {
    // A failed download leaves error reporting off for this visit.
  });
};

/** Reports an error, loading Sentry first if it hasn't arrived yet. */
export const captureError = (error: unknown): void => {
  load()
    .then((Sentry) => Sentry?.captureException(error))
    .catch(() => {
      // Nothing more to do: reporting is best effort.
    });
};

/** Next.js calls this on every client-side navigation (instrumentation-client). */
export const onRouterTransitionStart = (
  href: string,
  navigationType: string
): void => {
  sentry?.captureRouterTransitionStart(href, navigationType);
};
