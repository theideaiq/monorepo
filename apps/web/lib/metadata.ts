import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { locales } from "@repo/internationalization";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";

interface PageMetadata {
  description: string;
  image?: string | null;
  title: string;
  type?: "article" | "website";
}

/**
 * The site's public origin: the Vercel production domain, then
 * NEXT_PUBLIC_WEB_URL, then the project URL.
 */
export const siteUrl = () => {
  if (env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  return new URL(env.NEXT_PUBLIC_WEB_URL || project.url || "https://theideaiq.com");
};

/**
 * Page metadata with the canonical URL for this language and hreflang links
 * to the same page in every other language.
 */
export const localizedMetadata = (
  locale: Locale,
  path: string,
  { image, type = "website", ...page }: PageMetadata
): Metadata => {
  const suffix = path === "/" ? "" : path;

  return createMetadata({
    ...page,
    alternates: {
      canonical: `/${locale}${suffix}`,
      languages: Object.fromEntries(
        locales.map((language) => [language, `/${language}${suffix}`])
      ),
    },
    image: image ?? undefined,
    locale,
    metadataBase: siteUrl(),
    openGraph: { type, url: `/${locale}${suffix}` },
  });
};

type StaticPage =
  | "about"
  | "academy"
  | "careers"
  | "club"
  | "droid"
  | "events"
  | "faq"
  | "journal"
  | "news"
  | "suite";

/** `generateMetadata` for a page whose title and description are in `web.<page>.meta`. */
export const staticPageMetadata =
  (page: StaticPage, path: string) =>
  async ({ params }: { params: Promise<{ locale: Locale }> }) => {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "web" });
    return localizedMetadata(locale, path, {
      description: t(`${page}.meta.description`),
      title: t(`${page}.meta.title`),
    });
  };
