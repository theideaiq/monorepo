import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getBoxy } from "@/lib/boxy/service";
import { requireStaffCaller } from "../../_lib/staff";
import { notConfigured, SHIPPING_ROLES, shipmentErrorResponse } from "../_lib";

const body = z.object({ orderId: z.uuid() });

/**
 * The parcel's label for printing: the PDF as base64 (the back office
 * downloads it), or Boxy's link to it.
 */
export const POST = async (request: Request) => {
  const caller = await requireStaffCaller(request, SHIPPING_ROLES);
  if (caller instanceof NextResponse) {
    return caller;
  }
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const boxy = getBoxy();
  if (!boxy) {
    return notConfigured();
  }
  try {
    const { data: shipment } = await createAdminClient()
      .from("shipments")
      .select("carrier_id")
      .eq("order_id", parsed.data.orderId)
      .eq("active", true)
      .maybeSingle();
    if (!shipment) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const label = await boxy.label(shipment.carrier_id);
    return NextResponse.json(
      label.kind === "pdf"
        ? { pdf: Buffer.from(label.bytes).toString("base64") }
        : { url: label.url }
    );
  } catch (error) {
    return shipmentErrorResponse(error, "label");
  }
};
