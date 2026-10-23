import type { MetadataRoute } from "next";

/** The back office is for staff only: keep every crawler out. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { disallow: "/", userAgent: "*" } };
}
