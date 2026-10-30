/**
 * The developer docs (apps/api/docs, hosted on Mintlify) at the root of this
 * site, by rewrite: api.theideaiq.com/ is the docs, while the API keeps
 * its own paths. The rewrites are fallbacks, so every route of this app
 * (`/oidc/*`, `/webhooks/*`, `/cron/*`, …) answers first.
 */

/** First path segments that are the API's: never sent to the docs. */
const API_SEGMENTS = [
  "account",
  "admin",
  "auth",
  "calendar",
  "checkout",
  "contact",
  "cron",
  "health",
  "ingest",
  "monitoring",
  "oidc",
  "orders",
  "organizations",
  "pass",
  "push",
  "status",
  "telegram",
  "v1",
  "webhooks",
];

interface Rewrite {
  destination: string;
  source: string;
}

/** The rewrites to the docs at `docsUrl`; none while it isn't set. */
export const docsRewrites = (docsUrl: string | undefined): Rewrite[] => {
  if (!docsUrl) {
    return [];
  }
  const { origin } = new URL(docsUrl);
  const api = API_SEGMENTS.join("|");
  return [
    // Mintlify's assets and its search/chat endpoint stay at the root.
    { destination: `${origin}/_mintlify/:path*`, source: "/_mintlify/:path*" },
    {
      destination: `${origin}/mintlify-assets/:path+`,
      source: "/mintlify-assets/:path+",
    },
    { destination: `${origin}/_mintlify/api/request`, source: "/api/request" },
    { destination: `${origin}/`, source: "/" },
    {
      destination: `${origin}/:path*`,
      source: `/:path((?!(?:${api})(?:/|$)).+)`,
    },
  ];
};
