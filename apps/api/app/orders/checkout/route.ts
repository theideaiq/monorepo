import {
  attributionSchema,
  collectAttribution,
  getConversions,
} from "@repo/analytics/conversions";
import { authenticateRequest } from "@repo/auth/verify";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { getPurchasePolicy, type Platform } from "@repo/payments";
import { getBilling, OrderNotPayableError } from "@repo/payments/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/cors";

const body = z.object({
  attribution: attributionSchema.optional(),
  orderId: z.uuid(),
  redirectUrl: z.url().optional(),
});

const platforms = new Set<Platform>(["web", "ios", "android"]);

/**
 * Only redirect back to the website (Your Pass, where orders live), never to
 * arbitrary sites.
 */
const safeRedirect = (redirectUrl: string | undefined, orderId: string) => {
  const web = new URL(env.NEXT_PUBLIC_WEB_URL);
  if (!redirectUrl) {
    return new URL(`/pass/orders/${orderId}`, web).toString();
  }
  return new URL(redirectUrl).origin === web.origin ? redirectUrl : undefined;
};

export const OPTIONS = preflight;

/**
 * Opens the hosted checkout for one of the caller's pending store orders
 * (created with the `create_order` RPC). The amount is the stored order
 * total; the client never sends prices.
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

  const platformHeader = request.headers.get("x-client-platform") as Platform;
  const platform = platforms.has(platformHeader) ? platformHeader : "web";
  const policy = getPurchasePolicy(platform);
  if (!policy.allowed) {
    return json({ error: policy.reason }, 403);
  }

  const { orderId } = parsed.data;
  const redirectUrl = safeRedirect(parsed.data.redirectUrl, orderId);
  if (!redirectUrl) {
    return json({ error: "invalid_redirect" }, 400);
  }

  const metadata =
    platform === "web" && getConversions().enabled
      ? { attribution: collectAttribution(request, parsed.data.attribution) }
      : undefined;

  try {
    const checkout = await getBilling().startOrderCheckout({
      metadata,
      orderId,
      redirectUrl,
      userId: session.userId,
    });
    return json(checkout);
  } catch (error) {
    if (error instanceof OrderNotPayableError) {
      return json({ error: "order_not_payable" }, 409);
    }
    log.error(`Order checkout failed: ${parseError(error)}`);
    return json({ error: "checkout_failed" }, 502);
  }
};
