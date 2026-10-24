import type { MetadataRoute } from "next";

/** Sign-in pages only: keep every crawler out. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { disallow: "/", userAgent: "*" } };
}
