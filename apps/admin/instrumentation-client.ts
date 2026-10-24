import { initializeSentry } from "@repo/observability/client";

// The back office loads no analytics or ad pixels.
initializeSentry();

export { onRouterTransitionStart } from "@repo/observability/client";
