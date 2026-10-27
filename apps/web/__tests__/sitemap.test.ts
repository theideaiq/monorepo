import { describe, expect, it } from "vitest";
import { buildSitemap, staticPaths } from "@/lib/sitemap";

describe("buildSitemap", () => {
  const now = new Date("2026-10-23T00:00:00Z");

  it("lists every page once per language with hreflang alternates", () => {
    const sitemap = buildSitemap(
      "https://theideaiq.com",
      ["ar", "en"],
      [
        { path: "" },
        { lastModified: "2026-10-01T10:00:00Z", path: "/store/ps5" },
      ],
      now
    );

    expect(sitemap.map((entry) => entry.url)).toEqual([
      "https://theideaiq.com/ar",
      "https://theideaiq.com/",
      "https://theideaiq.com/ar/store/ps5",
      "https://theideaiq.com/store/ps5",
    ]);
    expect(sitemap[2]?.alternates?.languages).toEqual({
      ar: "https://theideaiq.com/ar/store/ps5",
      en: "https://theideaiq.com/store/ps5",
    });
    expect(sitemap[0]?.lastModified).toEqual(now);
    expect(sitemap[3]?.lastModified).toEqual(new Date("2026-10-01T10:00:00Z"));
  });

  it("covers the site's main sections", () => {
    for (const path of [
      "/store",
      "/plus",
      "/club",
      "/partners",
      "/help",
      "/careers",
    ]) {
      expect(staticPaths).toContain(path);
    }
    expect(staticPaths).not.toContain("/pricing");
    expect(staticPaths).not.toContain("/suite");
  });
});
