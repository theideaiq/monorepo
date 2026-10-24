import { initializeSentry } from "@repo/observability/client";

// The IDEA Pass loads no analytics or ad pixels.
initializeSentry();

export { onRouterTransitionStart } from "@repo/observability/client";
