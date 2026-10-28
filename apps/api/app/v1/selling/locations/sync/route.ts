import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getBoxy } from "@/lib/boxy/service";
import { syncSellerLocation } from "@/lib/boxy/shop-parcels";
import { preflight } from "@/lib/cors";
import { authenticate, canManage, json, problemResponse } from "../../_lib";

export const OPTIONS = preflight;

const body = z.object({ location: z.uuid() });

/**
 * Saves a shop's branch in Boxy as its pickup location, after the shop's
 * owner or admin adds or edits it in Partners.
 */
export const POST = async (request: Request) => {
  const session = await authenticate(request);
  if (session instanceof NextResponse) {
    return session;
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json(request, { error: "invalid_request" }, 400);
  }
  const boxy = getBoxy();
  if (!boxy) {
    return json(request, { error: "carrier_not_configured" }, 503);
  }
  const admin = createAdminClient();
  const { data: location } = await admin
    .from("seller_locations")
    .select("seller_id")
    .eq("id", parsed.data.location)
    .maybeSingle();
  if (!(location && (await canManage(session, location.seller_id)))) {
    return json(request, { error: "not_found" }, 404);
  }
  try {
    await syncSellerLocation(admin, boxy, parsed.data.location);
    return json(request, { ok: true });
  } catch (error) {
    return problemResponse(request, error, "location sync");
  }
};
