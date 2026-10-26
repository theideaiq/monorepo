import {
  attributionSchema,
  collectAttribution,
  getConversions,
} from "@repo/analytics/conversions";
import { authenticateRequest } from "@repo/auth/verify";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { getPurchasePolicy, type Platform } from "@repo/payments";
import { getBilling } from "@repo/payments/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/cors";
import { isManager, membershipRole } from "@/lib/membership";

const body = z.object({
  /** Ad identifiers from `getAttribution()` in @repo/analytics/client. */
  attribution: attributionSchema.optional(),
  /** Business plans are paid by an organization; The IDEA Plus by the user. */
  organizationId: z.uuid().optional(),
  planId: z.string().min(1),
  redirectUrl: z.url().optional(),
});

const platforms = new Set<Platform>(["web", "ios", "android"]);

/**
 * Only redirect back to our own sites, never to arbitrary ones: the website
 * for The IDEA Plus, The IDEA Business for business plans.
 */
const safeRedirect = (redirectUrl: string | undefined, business: boolean) => {
  const home = business
    ? new URL("/billing", env.NEXT_PUBLIC_APP_URL)
    : new URL("/plus", env.NEXT_PUBLIC_WEB_URL);
  if (!redirectUrl) {
    return home.toString();
  }
  return new URL(redirectUrl).origin === home.origin ? redirectUrl : undefined;
};

export const OPTIONS = preflight;

/**
 * Starts a checkout for a plan: a business plan for an organization the
 * caller manages, or The IDEA Plus for the caller. Called by the website, The IDEA Business and the native apps
 * with `Authorization: Bearer <Supabase access token>`.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "invalid_request" }, 400);
  }

  // Store billing rules: digital goods can't use third-party checkout inside
  // the iOS/Android apps (see @repo/payments/policy).
  const platformHeader = request.headers.get("x-client-platform") as Platform;
  const platform = platforms.has(platformHeader) ? platformHeader : "web";
  const policy = getPurchasePolicy(platform);
  if (!policy.allowed) {
    return json({ error: policy.reason }, 403);
  }

  const { organizationId, planId } = parsed.data;
  const redirectUrl = safeRedirect(
    parsed.data.redirectUrl,
    organizationId !== undefined
  );
  if (!redirectUrl) {
    return json({ error: "invalid_redirect" }, 400);
  }

  const { data: plan } = await session.supabase
    .from("plans")
    .select("audience")
    .eq("id", planId)
    .eq("active", true)
    .maybeSingle();
  if (!plan || (plan.audience === "plus") !== (organizationId === undefined)) {
    return json({ error: "invalid_plan" }, 400);
  }

  if (
    organizationId &&
    !isManager(await membershipRole(session, organizationId))
  ) {
    return json({ error: "forbidden" }, 403);
  }

  // 13–17-year-olds join The IDEA Plus once their guardian allows it.
  if (plan.audience === "plus") {
    const { data: guardian } = await session.supabase
      .rpc("my_guardian")
      .maybeSingle();
    if (guardian?.minor && !guardian.allows_plus) {
      return json({ error: "guardian_required" }, 403);
    }

    // Plus has a set number of places: joining needs a free one (or an
    // invite from the waitlist) and a home in Baghdad.
    const { data: status } = await session.supabase
      .rpc("plus_status")
      .maybeSingle();
    if (!status?.can_join) {
      return json({ error: `plus_${status?.join_reason ?? "full"}` }, 403);
    }
  }

  // Browser checkouts keep the context needed to report the purchase to ad
  // platforms later; nothing is stored unless conversions are configured.
  const metadata =
    platform === "web" && getConversions().enabled
      ? { attribution: collectAttribution(request, parsed.data.attribution) }
      : undefined;

  try {
    const checkout = await getBilling().startCheckout({
      metadata,
      owner: organizationId ? { organizationId } : { userId: session.userId },
      planId,
      redirectUrl,
      userId: session.userId,
    });
    return json(checkout);
  } catch (error) {
    log.error(`Checkout failed: ${parseError(error)}`);
    return json({ error: "checkout_failed" }, 502);
  }
};
