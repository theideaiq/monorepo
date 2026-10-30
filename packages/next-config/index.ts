import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

type RemotePattern = NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
>[number];

/**
 * Where catalog images may come from: the Supabase `catalog` bucket and the
 * cover-art sources the initial catalog links to (album covers from the
 * Cover Art Archive, which redirects to archive.org; book covers from Open
 * Library; game, film and product images from Wikimedia) and the product
 * lookups' sources (Google Books, Discogs, IGDB, TMDB, Scryfall, the
 * Pokémon TCG API). Next.js fetches
 * them on the server and serves them from /_next/image, so browsers only
 * load images from the app's own origin.
 */
export const catalogImagePatterns = (supabaseUrl?: string): RemotePattern[] => {
  const supabase = supabaseUrl ? new URL(supabaseUrl) : null;
  return [
    ...(supabase
      ? [
          {
            hostname: supabase.hostname,
            pathname: "/storage/v1/object/public/**",
            port: supabase.port,
            protocol: supabase.protocol.replace(":", "") as "http" | "https",
          },
        ]
      : []),
    { hostname: "coverartarchive.org", protocol: "https" },
    { hostname: "archive.org", protocol: "https" },
    { hostname: "*.archive.org", protocol: "https" },
    { hostname: "covers.openlibrary.org", protocol: "https" },
    { hostname: "upload.wikimedia.org", protocol: "https" },
    { hostname: "books.google.com", protocol: "https" },
    { hostname: "i.discogs.com", protocol: "https" },
    { hostname: "images.igdb.com", protocol: "https" },
    { hostname: "image.tmdb.org", protocol: "https" },
    { hostname: "cards.scryfall.io", protocol: "https" },
    { hostname: "images.pokemontcg.io", protocol: "https" },
  ];
};

/** True for a Supabase URL on this machine (the local development stack). */
export const isLocalUrl = (url?: string) =>
  url
    ? ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname)
    : false;

export const config: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
  },

  // biome-ignore lint/suspicious/useAwait: rewrites is async
  async rewrites() {
    return [
      {
        destination: "https://us-assets.i.posthog.com/static/:path*",
        source: "/ingest/static/:path*",
      },
      {
        destination: "https://us.i.posthog.com/:path*",
        source: "/ingest/:path*",
      },
      {
        destination: "https://us.i.posthog.com/decide",
        source: "/ingest/decide",
      },
    ];
  },

  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export const withAnalyzer = (sourceConfig: NextConfig): NextConfig =>
  withBundleAnalyzer()(sourceConfig);
