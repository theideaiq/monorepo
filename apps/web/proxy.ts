import { refreshSession } from "@repo/auth/proxy";
import { internationalizationMiddleware } from "@repo/internationalization/proxy";
import { telegramMiniAppCspSources } from "@repo/security/csp";
import {
  noseconeOptions,
  noseconeOptionsWith,
  withSecurityHeaders,
} from "@repo/security/proxy";
import type { NextRequest } from "next/server";
import {
  embedClientId,
  isEmbedConnectPath,
  isEmbedRequestPath,
  isEmbedSignIn,
} from "@/lib/pass-embed";

export const config = {
  // Every route except static assets, the PostHog ingest rewrites, the
  // sitemap and /.well-known (app links: apple-app-site-association,
  // assetlinks.json).
  matcher: [
    "/((?!_next/static|_next/image|ingest|\\.well-known|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

// The website is also the Droid's Mini App (/tg, then the store, cart and
// checkout), which Telegram Web shows in a frame.
const options = noseconeOptionsWith(telegramMiniAppCspSources);

/** The popup's pages keep their opener (the frame waiting for its token). */
const keepOpener = {
  ...noseconeOptions,
  crossOriginOpenerPolicy: { policy: "unsafe-none" as const },
};

/**
 * The origins that may frame an app's live card (its verified domains), or
 * none when the app may not embed it.
 */
const embedOrigins = async (clientId: string | null) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!(clientId && url && key)) {
    return [];
  }
  try {
    const response = await fetch(`${url}/rest/v1/rpc/pass_card_embed_site`, {
      body: JSON.stringify({ client: clientId }),
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      method: "POST",
    });
    const rows = (await response.json()) as { origins?: string[] }[];
    return response.ok ? (rows[0]?.origins ?? []) : [];
  } catch {
    return [];
  }
};

/**
 * The live card's pages: the embed may be framed only by the app's verified
 * domains (no one else, not even Telegram); its connect popup is never
 * framed and keeps its opener, so it can hand the frame its token.
 */
const embedOptions = async (request: NextRequest) => {
  if (isEmbedConnectPath(request.nextUrl.pathname)) {
    return keepOpener;
  }
  const origins = await embedOrigins(
    embedClientId(request.nextUrl.searchParams.get("client_id"))
  );
  return origins.length > 0
    ? noseconeOptionsWith({ frameAncestors: origins })
    : noseconeOptions;
};

const VERIFY_PATH =
  /^(\/ar)?\/verify\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

/** The origins that may frame a partner's verification (its verified domains). */
const verificationOrigins = async (id: string) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!(url && key)) {
    return [];
  }
  try {
    const response = await fetch(
      `${url}/rest/v1/rpc/student_verification_origins`,
      {
        body: JSON.stringify({ target: id }),
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        method: "POST",
      }
    );
    const origins = (await response.json()) as string[] | null;
    return response.ok && Array.isArray(origins) ? origins : [];
  } catch {
    return [];
  }
};

/**
 * A partner's student verification (/verify/<id>) keeps its opener, so a
 * popup can tell the partner's page; `?embed=1` may be framed by the
 * partner's verified domains only.
 */
const verificationOptions = async (request: NextRequest, id: string) => {
  if (request.nextUrl.searchParams.get("embed") !== "1") {
    return keepOpener;
  }
  const origins = await verificationOrigins(id);
  return origins.length > 0
    ? {
        ...noseconeOptionsWith({ frameAncestors: origins }),
        crossOriginOpenerPolicy: keepOpener.crossOriginOpenerPolicy,
      }
    : keepOpener;
};

/**
 * Adds the locale prefix (/ar; none for English), keeps the shared session cookie of
 * The IDEA Pass fresh (so its pages and Server Actions read a valid token)
 * and adds the security headers (Nosecone). The site holds no secrets: its
 * forms and privileged steps go to apps/api. Access control stays in the
 * pages, the Server Actions and Row Level Security.
 */
export default async function proxy(request: NextRequest) {
  const response = internationalizationMiddleware(request);
  const { pathname, searchParams } = request.nextUrl;
  let headers = options;
  const verification = VERIFY_PATH.exec(pathname)?.[2];
  if (verification) {
    headers = await verificationOptions(request, verification.toLowerCase());
  } else if (isEmbedRequestPath(pathname)) {
    headers = await embedOptions(request);
  } else if (isEmbedSignIn(pathname, searchParams.get("return_to"))) {
    headers = keepOpener;
  }
  return withSecurityHeaders(await refreshSession(request, response), headers);
}
