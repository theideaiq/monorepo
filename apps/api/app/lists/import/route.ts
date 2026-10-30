import { authenticateRequest } from "@repo/auth/verify";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/cors";
import {
  discogsUsername,
  fetchDiscogsWants,
  fetchSteamWishlist,
  ListImportError,
  steamId,
} from "@/lib/lists";

export const OPTIONS = preflight;

const bodySchema = z.object({
  account: z.string().trim().min(1).max(200),
  source: z.enum(["discogs", "steam"]),
});

/**
 * Reads a member's public Discogs wantlist or Steam wishlist for "Import
 * your list" (Pass → Saved → Lists). Returns the items; the website then
 * imports them with the member's own session (`import_list_items`).
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return json({ error: "invalid_request" }, 400);
  }

  try {
    if (body.data.source === "discogs") {
      const username = discogsUsername(body.data.account);
      if (!username) {
        return json({ error: "not_found" }, 404);
      }
      return json({
        items: await fetchDiscogsWants(username, { token: env.DISCOGS_TOKEN }),
      });
    }
    const id = await steamId(body.data.account);
    if (!id) {
      return json({ error: "not_found" }, 404);
    }
    return json({ items: await fetchSteamWishlist(id) });
  } catch (error) {
    if (error instanceof ListImportError) {
      return json(
        { error: error.code },
        error.code === "unavailable" ? 502 : 404
      );
    }
    log.error(`List import failed: ${parseError(error)}`);
    return json({ error: "unavailable" }, 502);
  }
};
