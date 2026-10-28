import { createRequire } from "node:module";
import { describe, expect, test } from "vitest";
import { docsRewrites } from "@/lib/docs";

// The matcher Next.js uses for rewrite sources.
const { pathToRegexp } = createRequire(import.meta.url)(
  "next/dist/compiled/path-to-regexp"
) as { pathToRegexp: (path: string) => RegExp };

const DOCS = "https://theidea.mintlify.site";

/** Where `path` goes: the first rewrite whose source matches, or null. */
const target = (path: string) => {
  for (const rule of docsRewrites(DOCS)) {
    if (pathToRegexp(rule.source).test(path)) {
      return rule.destination;
    }
  }
  return null;
};

describe("docsRewrites", () => {
  test("nothing while the docs aren't set up", () => {
    expect(docsRewrites(undefined)).toEqual([]);
  });

  test("the docs' pages and assets go to Mintlify", () => {
    expect(target("/")).toBe(`${DOCS}/`);
    expect(target("/quickstart")).toBe(`${DOCS}/:path*`);
    expect(target("/sign-in/overview")).toBe(`${DOCS}/:path*`);
    expect(target("/_mintlify/static/app.css")).toBe(
      `${DOCS}/_mintlify/:path*`
    );
    expect(target("/api/request")).toBe(`${DOCS}/_mintlify/api/request`);
    // A docs page that only starts like an API path.
    expect(target("/passwords")).toBe(`${DOCS}/:path*`);
  });

  test("the API's paths never do", () => {
    for (const path of [
      "/oidc/token",
      "/oidc/unknown",
      "/webhooks/wayl",
      "/cron/push",
      "/v1/anything",
      "/health",
      "/pass",
    ]) {
      expect(target(path)).toBeNull();
    }
  });
});
