import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      allow: "/",
      // The mini-game is meant to be opened from Telegram.
      disallow: "/games/",
      userAgent: "*",
    },
    sitemap: new URL("/sitemap.xml", siteUrl()).href,
  };
}
