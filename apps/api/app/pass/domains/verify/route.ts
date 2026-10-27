import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/cors";
import { checkDomain } from "@/lib/oidc/domains";

export const OPTIONS = preflight;

const bodySchema = z.object({ id: z.uuid() });

/** A company checks a domain at most every 10 seconds. */
const CHECK_INTERVAL_MS = 10_000;

/**
 * The IDEA Partners → Developers: checks that a company published its
 * domain's token (DNS TXT record or file) and marks the domain verified.
 * The caller must be the company's owner or admin.
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

  const admin = createAdminClient();
  const { data: domain } = await admin
    .from("pass_partner_domains")
    .select("id, organization_id, domain, token, verified_at, checked_at")
    .eq("id", body.data.id)
    .maybeSingle();
  if (!domain) {
    return json({ error: "not_found" }, 404);
  }
  const { data: membership } = await admin
    .from("memberships")
    .select("role")
    .eq("organization_id", domain.organization_id)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!(membership && ["owner", "admin"].includes(membership.role))) {
    return json({ error: "forbidden" }, 403);
  }
  if (domain.verified_at) {
    return json({ verified: true });
  }
  if (
    domain.checked_at &&
    Date.now() - Date.parse(domain.checked_at) < CHECK_INTERVAL_MS
  ) {
    return json({ error: "too_soon" }, 429);
  }

  const now = new Date().toISOString();
  const method = await checkDomain(domain.domain, domain.token);
  await admin
    .from("pass_partner_domains")
    .update({ checked_at: now, ...(method ? { verified_at: now } : {}) })
    .eq("id", domain.id);
  return json({ method, verified: Boolean(method) });
};
