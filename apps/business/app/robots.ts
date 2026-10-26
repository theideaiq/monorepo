import type { MetadataRoute } from "next";

/**
 * The IDEA Business is only for staff and businesses, all behind a sign-in:
 * nothing here is for crawlers (every page says noindex too).
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { disallow: "/", userAgent: "*" } };
}
