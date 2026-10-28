import type { MetadataRoute } from "next";

/**
 * Partners is only for partners, behind a sign-in:
 * nothing here is for crawlers (every page says noindex too).
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { disallow: "/", userAgent: "*" } };
}
