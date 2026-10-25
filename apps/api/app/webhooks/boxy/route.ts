import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { getBoxy, syncByReference } from "@/lib/boxy/service";
import { webhookReference } from "@/lib/boxy/webhook";

/** True when the request carries the header value set in Boxy's dashboard. */
const verified = (request: Request) => {
  const expected = env.BOXY_WEBHOOK_SECRET;
  const received = request.headers.get(env.BOXY_WEBHOOK_HEADER);
  if (!(expected && received)) {
    return false;
  }
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Boxy's order webhooks (set in Boxy's dashboard with a custom header).
 * The payload isn't documented, so it is only a signal: the parcel it names
 * is re-read from Boxy's API before anything changes.
 */
export const POST = async (request: Request): Promise<Response> => {
  if (!verified(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const payload: unknown = await request.json().catch(() => null);
  const boxy = getBoxy();
  const found = webhookReference(payload);
  if (!(boxy && found)) {
    return NextResponse.json({ ok: true, synced: false });
  }
  try {
    const status = await syncByReference(createAdminClient(), boxy, found);
    return NextResponse.json({ ok: true, status, synced: status !== null });
  } catch (error) {
    log.error(`Boxy webhook failed: ${parseError(error)}`);
    // A 5xx makes Boxy retry the delivery.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
};
