import { initializeSentry } from "@repo/observability/client";

// Staff loads no analytics.
initializeSentry();

export { onRouterTransitionStart } from "@repo/observability/client";
