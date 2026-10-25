import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { dispatchOrder, getBoxy } from "@/lib/boxy/service";
import { requireStaffCaller } from "../_lib/staff";
import { notConfigured, SHIPPING_ROLES, shipmentErrorResponse } from "./_lib";

const body = z.object({
  fragile: z.boolean().default(false),
  orderId: z.uuid(),
  size: z.enum(["S", "M", "L"]),
});

/**
 * Sends a packed order to Boxy (back office → order → Send with Boxy): the
 * parcel is created, a pick-up requested, and the order marked shipped.
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
    const result = await dispatchOrder(createAdminClient(), boxy, {
      ...parsed.data,
      createdBy: caller.userId,
    });
    return NextResponse.json(result);
  } catch (error) {
    return shipmentErrorResponse(error, "dispatch");
  }
};
