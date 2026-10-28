import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getBoxy } from "@/lib/boxy/service";
import { sendShopParcels } from "@/lib/boxy/shop-parcels";
import { preflight } from "@/lib/cors";
import { authenticate, json, problemResponse } from "../_lib";

export const OPTIONS = preflight;

const body = z.object({
  lines: z.array(z.uuid()).min(1).max(200),
  location: z.uuid(),
  size: z.enum(["S", "M", "L"]).default("M"),
});

/**
 * "Ready for pickup": readies the shop's lines at a branch (as the member,
 * so the database checks they work there), then sends one Boxy parcel per
 * order and asks Boxy to collect them.
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
  const { data: orders, error: refused } = await session.supabase.rpc(
    "mark_lines_ready",
    { lines: parsed.data.lines, location: parsed.data.location }
  );
  if (refused) {
    return json(
      request,
      { error: "not_ready", message: refused.message },
      refused.code === "42501" ? 403 : 409
    );
  }
  try {
    const sent = await sendShopParcels(createAdminClient(), boxy, {
      createdBy: session.userId,
      locationId: parsed.data.location,
      orderIds: (orders ?? []) as string[],
      size: parsed.data.size,
    });
    return json(request, sent);
  } catch (error) {
    return problemResponse(request, error, "ready for pickup");
  }
};
