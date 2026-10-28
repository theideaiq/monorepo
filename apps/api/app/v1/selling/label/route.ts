import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getBoxy } from "@/lib/boxy/service";
import { CANCELLABLE } from "@/lib/boxy/sync";
import { preflight } from "@/lib/cors";
import { authenticate, json, problemResponse, shopRole } from "../_lib";

export const OPTIONS = preflight;

const body = z.object({ shipment: z.uuid() });

/**
 * A shop's parcel label for printing (the PDF as base64, or Boxy's link),
 * until the courier has collected it: it carries the customer's name,
 * phone and address, which the shop sees nowhere else.
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
  const { data: shipment } = await createAdminClient()
    .from("shipments")
    .select("carrier_id, seller_id, status, active")
    .eq("id", parsed.data.shipment)
    .maybeSingle();
  if (!(shipment?.active && (await shopRole(session, shipment.seller_id)))) {
    return json(request, { error: "not_found" }, 404);
  }
  if (!CANCELLABLE.has(shipment.status)) {
    return json(request, { error: "picked_up" }, 409);
  }
  try {
    const label = await boxy.label(shipment.carrier_id);
    return json(
      request,
      label.kind === "pdf"
        ? { pdf: Buffer.from(label.bytes).toString("base64") }
        : { url: label.url }
    );
  } catch (error) {
    return problemResponse(request, error, "label");
  }
};
