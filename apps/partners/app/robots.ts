import type { MetadataRoute } from "next";

/**
 * The IDEA Partners and Staff are only for partners and staff, all behind a sign-in:
 * nothing here is for crawlers (every page says noindex too).
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { disallow: "/", userAgent: "*" } };
}
