import { locales } from "@repo/internationalization";
import type { MetadataRoute } from "next";

/**
 * The IDEA Spark is a signed-in app: crawlers may see its entry pages, but
 * never the back office or The IDEA Pass (their pages say noindex too).
 */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = ["admin", "mfa", "pass", "sign-in", "sign-out", "sign-up"];
  return {
    rules: {
      disallow: locales.flatMap((locale) =>
        privatePaths.map((path) => `/${locale}/${path}`)
      ),
      userAgent: "*",
    },
  };
}
