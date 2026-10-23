import { locales } from "@repo/internationalization";
import type { MetadataRoute } from "next";
import { getEvents, getIssues, getPosts, getProductSlugs } from "@/lib/data";
import { legalDocuments } from "@/lib/legal";
import { siteUrl } from "@/lib/metadata";
import { buildSitemap, type SitemapPage, staticPaths } from "@/lib/sitemap";

export const revalidate = 3600;

const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const [products, posts, upcoming, past, issues] = await Promise.all([
    getProductSlugs(),
    getPosts(1000),
    getEvents({ limit: 1000 }),
    getEvents({ limit: 1000, past: true }),
    getIssues(),
  ]);

  const pages: SitemapPage[] = [
    ...staticPaths.map((path) => ({ path })),
    ...legalDocuments.map(({ slug, updated }) => ({
      lastModified: updated,
      path: `/legal/${slug}`,
    })),
    ...products.map(({ slug, updated_at }) => ({
      lastModified: updated_at,
      path: `/store/${slug}`,
    })),
    ...posts.map(({ slug, updated_at }) => ({
      lastModified: updated_at,
      path: `/news/${slug}`,
    })),
    ...[...upcoming, ...past].map(({ slug, updated_at }) => ({
      lastModified: updated_at,
      path: `/events/${slug}`,
    })),
    ...issues.map(({ id, updated_at }) => ({
      lastModified: updated_at,
      path: `/journal/${id}`,
    })),
  ];

  return buildSitemap(siteUrl(), locales, pages);
};

export default sitemap;
