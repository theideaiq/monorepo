import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/oidc/clients";
import { noStore, oauthError } from "@/lib/oidc/protocol";

const reply = (data: object, status = 200, extra: HeadersInit = {}) =>
  NextResponse.json(data, { headers: { ...noStore, ...extra }, status });

const SCANNED = /^IDEA:\d{1,18}:\d{6}$/;

/** The scanned code, from a JSON body (`{ "code": … }`) or a form. */
const scannedCode = (body: string, contentType: string | null) => {
  if (contentType?.includes("application/json")) {
    try {
      const parsed = JSON.parse(body) as { code?: unknown };
      return typeof parsed.code === "string" ? parsed.code.trim() : null;
    } catch {
      return null;
    }
  }
  return new URLSearchParams(body).get("code")?.trim() ?? null;
};

const CREDENTIAL_FIELDS = [
  "client_id",
  "client_secret",
  "client_assertion_type",
  "client_assertion",
] as const;

/** Client credentials sent in a JSON body, as form fields. */
const jsonCredentials = (body: string) => {
  const form = new URLSearchParams();
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    for (const field of CREDENTIAL_FIELDS) {
      if (typeof parsed[field] === "string") {
        form.set(field, parsed[field]);
      }
    }
  } catch {
    // Not JSON: no credentials in the body.
  }
  return form;
};

/**
 * A partner's app checks a scanned The IDEA Pass card (its QR code reads
 * `IDEA:<member number>:<code>`, the code changing every 30 seconds):
 * whether it's valid, the holder's first name and member number, the
 * partner's id for them when they signed in there, and the yes/no answers
 * the partner may ask. Authenticated with the partner's client secret;
 * every check shows in the holder's Settings.
 */
export const POST = async (request: Request) => {
  const body = await request.text().catch(() => "");
  const form = request.headers.get("content-type")?.includes("application/json")
    ? jsonCredentials(body)
    : new URLSearchParams(body);
  const partner = await authenticatePartner(request, form);
  if (!partner) {
    return reply(oauthError("invalid_client"), 401, {
      "WWW-Authenticate": 'Basic realm="The IDEA Pass"',
    });
  }
  const code = scannedCode(body, request.headers.get("content-type"));
  if (!(code && SCANNED.test(code))) {
    return reply({ valid: false });
  }
  const { data, error } = await partner.admin.rpc("pass_card_check", {
    client: partner.clientId,
    scanned: code,
  });
  if (error) {
    if (error.message.includes("Too many checks")) {
      return reply({ error: "too_many_checks" }, 429, { "Retry-After": "600" });
    }
    log.error(`Pass card check failed: ${parseError(error)}`);
    return reply({ error: "server_error" }, 500);
  }
  return reply(data as object);
};
