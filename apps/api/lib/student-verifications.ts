import type { Database } from "@repo/database";
import { resend, sendEmail } from "@repo/email";
import {
  StudentCodeTemplate,
  studentCodeSubject,
} from "@repo/email/templates/student-code";
import {
  type StudentVerificationOutcome,
  StudentVerificationTemplate,
  studentVerificationSubject,
} from "@repo/email/templates/student-verification";
import { formatDate } from "@repo/internationalization/format";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { createRateLimiter, slidingWindow } from "@repo/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { createElement } from "react";
import { env } from "@/env";
import { issuer, signingKey } from "./oidc/signing";

type Admin = SupabaseClient<Database>;
export type Locale = "ar" | "en";

const TRAILING_SLASH = /\/$/;

const web = () => env.NEXT_PUBLIC_WEB_URL.replace(TRAILING_SLASH, "");

/** Where the partner sends the student: theideaiq.com/verify/<id>. */
export const verifyUrl = (id: string) => `${web()}/verify/${id}`;

/** The confirmation email's "Delete this verification" link. */
export const deleteUrl = (id: string, token: string, locale: Locale) =>
  `${web()}${locale === "ar" ? "/ar" : ""}/verify/${id}/delete?token=${token}`;

/** What a partner gets: the status, the university and the expiry; nothing else. */
export const partnerView = (row: {
  id: string;
  status: string;
  university_id: string | null;
  valid_until: string | null;
}) => ({
  id: row.id,
  status: row.status,
  university: row.status === "verified" ? row.university_id : null,
  valid_until: row.status === "verified" ? row.valid_until : null,
});

// At most 5 codes a day per address (Upstash keys expire by themselves).
const codeLimiter =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createRateLimiter({
        limiter: slidingWindow(5, "1 d"),
        prefix: "student-verification-code",
      })
    : undefined;

/** Whether another code may go to the address today. */
export const mayEmailCode = async (address: string) =>
  codeLimiter
    ? (await codeLimiter.limit(address.trim().toLowerCase())).success
    : true;

export const emailReady = () => Boolean(resend && env.RESEND_FROM);

/** The partner's name and the university's name in the email's language. */
export const names = async (
  admin: Admin,
  verificationId: string,
  locale: Locale
) => {
  const { data } = await admin
    .from("student_verifications")
    .select(
      "university_id, partner:pass_partners!inner (name), university:universities (name_ar, name_en)"
    )
    .eq("id", verificationId)
    .maybeSingle();
  const university = Array.isArray(data?.university)
    ? data?.university[0]
    : data?.university;
  const partner = Array.isArray(data?.partner)
    ? data?.partner[0]
    : data?.partner;
  return {
    partner: partner?.name ?? "",
    university:
      (locale === "ar" ? university?.name_ar : university?.name_en) ?? "",
  };
};

/** Emails the 8-digit code for a partner's verification. */
export const emailCode = async (
  admin: Admin,
  {
    code,
    email,
    id,
    locale,
  }: { code: string; email: string; id: string; locale: Locale }
) => {
  const { partner, university } = await names(admin, id, locale);
  await sendEmail({
    react: createElement(StudentCodeTemplate, {
      code,
      locale,
      partner,
      university,
    }),
    subject: studentCodeSubject(locale),
    to: email,
  });
};

/** Emails the outcome; best effort (the verification already changed). */
export const emailOutcome = async (
  admin: Admin,
  {
    email,
    id,
    locale,
    outcome,
    reason,
    token,
  }: {
    email: string | null;
    id: string;
    locale: Locale;
    outcome: StudentVerificationOutcome;
    reason?: string | null;
    token?: string | null;
  }
) => {
  if (!(email && emailReady())) {
    return;
  }
  try {
    const { partner, university } = await names(admin, id, locale);
    const { data: row } = await admin
      .from("student_verifications")
      .select("valid_until")
      .eq("id", id)
      .maybeSingle();
    await sendEmail({
      react: createElement(StudentVerificationTemplate, {
        deleteUrl: token ? deleteUrl(id, token, locale) : undefined,
        locale,
        outcome,
        partner,
        reason: reason ?? undefined,
        university,
        until: row?.valid_until
          ? formatDate(`${row.valid_until}T12:00:00`, locale, "long")
          : undefined,
      }),
      subject: studentVerificationSubject(locale, outcome),
      to: email,
    });
  } catch (error) {
    log.error(`Student verification email failed: ${parseError(error)}`);
  }
};

/**
 * A webhook event as a JWT signed with The IDEA's keys (the JWKS at
 * /oidc/jwks): `iss` is the issuer, `aud` the app's client id, `jti` the
 * event id, `type` and `data` the event.
 */
export const signEvent = async (event: {
  client_id: string;
  id: string;
  payload: unknown;
  type: string;
}) => {
  const signing = await signingKey();
  if (!signing) {
    return null;
  }
  return new SignJWT({ data: event.payload, type: event.type })
    .setProtectedHeader({
      alg: "ES256",
      kid: signing.kid,
      typ: "secevent+jwt",
    })
    .setIssuer(issuer())
    .setAudience(event.client_id)
    .setJti(event.id)
    .setIssuedAt()
    .sign(signing.key);
};

const WEBHOOK_TIMEOUT = 10_000;

/** Posts the queued webhook events; a non-2xx answer is tried again later. */
export const deliverWebhooks = async (
  admin: Admin,
  post: typeof fetch = fetch
) => {
  const { data: events, error } = await admin.rpc("claim_partner_webhooks", {
    max_rows: 50,
  });
  if (error) {
    throw error;
  }
  let delivered = 0;
  for (const event of events ?? []) {
    let failure: string | null = null;
    try {
      // biome-ignore lint/performance/noAwaitInLoops: a handful at a time, in order
      const token = await signEvent(event);
      if (token) {
        const response = await post(event.url, {
          body: token,
          headers: { "content-type": "application/secevent+jwt" },
          method: "POST",
          signal: AbortSignal.timeout(WEBHOOK_TIMEOUT),
        });
        failure = response.ok ? null : `HTTP ${response.status}`;
      } else {
        failure = "signing key not set";
      }
    } catch (postError) {
      failure = parseError(postError);
    }
    await admin.rpc("finish_partner_webhook", {
      delivered: failure === null,
      error: failure ?? undefined,
      target: event.id,
    });
    delivered += failure === null ? 1 : 0;
  }
  return delivered;
};

/** Delivers right away, best effort; the daily job retries what failed. */
export const deliverSoon = async (admin: Admin) => {
  try {
    await deliverWebhooks(admin);
  } catch (error) {
    log.error(`Partner webhooks failed: ${parseError(error)}`);
  }
};

/** What a failed database call means for the page. */
export const verificationError = (message: string | undefined) => {
  if (message?.includes("Use your university email")) {
    return "not_university";
  }
  if (message?.includes("Ask for a new code")) {
    return "code_expired";
  }
  if (message?.includes("Verify you're a student first")) {
    return "no_badge";
  }
  if (message?.includes("Verification not found")) {
    return "not_found";
  }
  if (message?.includes("Invalid return address")) {
    return "invalid_return_url";
  }
  return "failed";
};
