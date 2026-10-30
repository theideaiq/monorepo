import { authenticateRequest } from "@repo/auth/verify";
import { normalizeGtin } from "@repo/commerce/gtin";
import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/cors";
import { LOOKUP_FAMILIES, lookupProduct } from "@/lib/lookup";

export const OPTIONS = preflight;

const bodySchema = z
  .object({
    barcode: z.string().trim().max(30).optional(),
    creator: z.string().trim().max(200).optional(),
    family: z.enum(LOOKUP_FAMILIES),
    text: z.string().trim().max(200).optional(),
  })
  .refine((body) => body.barcode || body.text, "barcode or text");

/**
 * Product lookups for whoever adds products: Staff (any staff member) and
 * shops in Partners (members of an organization that sells). Looks the
 * item up in its family's sources (books: Open Library and Google Books;
 * music: MusicBrainz and Discogs; games: IGDB; films: TMDB; board games:
 * BoardGameGeek; trading cards: Scryfall and the Pokémon TCG API).
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const admin = createAdminClient();
  const [{ data: staff }, { data: shops }] = await Promise.all([
    admin.from("staff").select("user_id").eq("user_id", session.userId),
    admin
      .from("organization_members")
      .select("organization:organizations!inner(features)")
      .eq("user_id", session.userId)
      .contains("organization.features", ["selling"])
      .limit(1),
  ]);
  if (!(staff?.length || shops?.length)) {
    return json({ error: "forbidden" }, 403);
  }

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return json({ error: "invalid_request" }, 400);
  }
  const barcode = normalizeGtin(body.data.barcode) ?? undefined;
  if (body.data.barcode && !barcode && !body.data.text) {
    return json({ error: "invalid_barcode" }, 400);
  }

  const result = await lookupProduct(
    body.data.family,
    { barcode, creator: body.data.creator, text: body.data.text },
    {
      bggToken: env.BGG_TOKEN,
      discogsToken: env.DISCOGS_TOKEN,
      googleBooksKey: env.GOOGLE_BOOKS_API_KEY,
      igdb:
        env.IGDB_CLIENT_ID && env.IGDB_CLIENT_SECRET
          ? {
              clientId: env.IGDB_CLIENT_ID,
              clientSecret: env.IGDB_CLIENT_SECRET,
            }
          : undefined,
      pokemonKey: env.POKEMONTCG_API_KEY,
      tmdbToken: env.TMDB_READ_TOKEN,
    }
  );
  return json(result);
};
