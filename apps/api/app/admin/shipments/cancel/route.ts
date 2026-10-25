import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelShipment, getBoxy } from "@/lib/boxy/service";
import { requireStaffCaller } from "../../_lib/staff";
import { notConfigured, SHIPPING_ROLES, shipmentErrorResponse } from "../_lib";

const body = z.object({ orderId: z.uuid() });

/** Cancels the order's parcel with Boxy, before it is collected. */
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
    await cancelShipment(createAdminClient(), boxy, parsed.data.orderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return shipmentErrorResponse(error, "cancel");
  }
};
