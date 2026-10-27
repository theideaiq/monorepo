import type { MetadataRoute } from "next";

/**
 * Staff is only for The IDEA's team, behind a sign-in:
 * nothing here is for crawlers (every page says noindex too).
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { disallow: "/", userAgent: "*" } };
}
