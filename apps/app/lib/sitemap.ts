import { localePath } from "@repo/internationalization";
import type { MetadataRoute } from "next";

/** Pages without dynamic segments. */
export const staticPaths = [
  "",
  "/store",
  "/plus",
  "/club",
  "/partners",
  "/about",
  "/careers",
  "/help",
] as const;

export interface SitemapPage {
  lastModified?: string | Date;
  path: string;
}

/**
 * One sitemap entry per language for each page, each listing every
 * translation (hreflang alternates).
 */
export const buildSitemap = (
  baseUrl: string | URL,
  locales: readonly string[],
  pages: SitemapPage[],
  now: Date = new Date()
): MetadataRoute.Sitemap =>
  pages.flatMap(({ lastModified, path }) => {
    const languages = Object.fromEntries(
      locales.map((locale) => [
        locale,
        new URL(localePath(locale, path), baseUrl).href,
      ])
    );
    return locales.map((locale) => ({
      alternates: { languages },
      lastModified: lastModified ? new Date(lastModified) : now,
      url: languages[locale] as string,
    }));
  });
