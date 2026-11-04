import { setPostHog } from "./client";
import { keys } from "./keys";

/**
 * Starts PostHog when its key and host are set. The library is downloaded
 * only then, in the background, so it never weighs on the first load (A28).
 */
export const initializeAnalytics = () => {
  const { NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST } = keys();

  if (!(NEXT_PUBLIC_POSTHOG_KEY && NEXT_PUBLIC_POSTHOG_HOST)) {
    return;
  }

  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: NEXT_PUBLIC_POSTHOG_HOST,
        defaults: "2025-05-24",
      });
      setPostHog(posthog);
    })
    .catch(() => {
      // Product analytics is optional; the page works without it.
    });
};
