import "server-only";

import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { BoxyError } from "@/lib/boxy/client";
import { ShipmentError } from "@/lib/boxy/service";

/** Staff who handle orders can send and follow parcels. */
export const SHIPPING_ROLES = ["superadmin", "admin", "support"] as const;

/** The error response for a failed shipment call. */
export const shipmentErrorResponse = (error: unknown, action: string) => {
  if (error instanceof ShipmentError) {
    return NextResponse.json(
      { error: error.problem, message: error.message },
      { status: error.problem === "not_found" ? 404 : 409 }
    );
  }
  log.error(`Boxy ${action} failed: ${parseError(error)}`);
  return NextResponse.json(
    { error: error instanceof BoxyError ? "carrier_unavailable" : "failed" },
    { status: 502 }
  );
};

/** While Boxy isn't configured. */
export const notConfigured = () =>
  NextResponse.json({ error: "carrier_not_configured" }, { status: 503 });
