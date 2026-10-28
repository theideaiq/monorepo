import "server-only";

import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { BoxyError } from "@/lib/boxy/client";
import { ShipmentError } from "@/lib/boxy/service";
import { corsHeaders } from "@/lib/cors";
import {
  type ApiSession,
  isManager,
  organizationRole,
} from "@/lib/organization-role";

/**
 * Partners → Selling calls these with the member's token: the caller's
 * role in the shop's organization decides, and the admin client talks to
 * Boxy and writes what only apps/api may (Boxy uids, parcels).
 */

export const json = (request: Request, data: object, status = 200) =>
  NextResponse.json(data, { headers: corsHeaders(request), status });

export const authenticate = async (request: Request) => {
  const session = await authenticateRequest(request);
  return session ?? json(request, { error: "unauthorized" }, 401);
};

/** The caller's role in the shop that owns `sellerId`, or null. */
export const shopRole = async (session: ApiSession, sellerId: string) => {
  const { data: seller } = await createAdminClient()
    .from("sellers")
    .select("organization_id, is_house")
    .eq("id", sellerId)
    .maybeSingle();
  if (!seller?.organization_id || seller.is_house) {
    return null;
  }
  return organizationRole(session, seller.organization_id);
};

export const canManage = async (session: ApiSession, sellerId: string) =>
  isManager(await shopRole(session, sellerId));

export const problemResponse = (
  request: Request,
  error: unknown,
  action: string
) => {
  if (error instanceof ShipmentError) {
    return json(
      request,
      { error: error.problem, message: error.message },
      error.problem === "not_found" ? 404 : 409
    );
  }
  log.error(`Shop ${action} failed: ${parseError(error)}`);
  return json(
    request,
    { error: error instanceof BoxyError ? "carrier_unavailable" : "failed" },
    502
  );
};
