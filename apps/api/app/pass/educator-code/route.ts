import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { resend, sendEmail } from "@repo/email";
import {
  StudentCodeTemplate,
  studentCodeSubject,
} from "@repo/email/templates/student-code";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { createElement } from "react";
import { z } from "zod";
import { env } from "@/env";
import { corsHeaders, preflight } from "@/lib/cors";
import { studentCodeError } from "@/lib/pass/student-code";

export const OPTIONS = preflight;

const bodySchema = z.object({
  email: z.email().max(254),
  locale: z.enum(["ar", "en"]).default("en"),
  university: z.string().min(1).max(40),
});

/**
 * Emails the signed-in member a code that confirms their educator badge:
 * a staff address on their university's domain (`issue_educator_code()`
 * checks it, and allows 5 codes a day). They type the code back on the
 * website (`confirm_educator_email()`).
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
  if (!(resend && env.RESEND_FROM)) {
    return json({ error: "email_unavailable" }, 503);
  }

  const admin = createAdminClient();
  const { email, locale, university } = body.data;
  const { data: code, error } = await admin.rpc("issue_educator_code", {
    address: email,
    member: session.userId,
    university,
  });
  if (error || !code) {
    return json({ error: studentCodeError(error?.message) }, 400);
  }

  const { data: row } = await admin
    .from("universities")
    .select("name_ar, name_en")
    .eq("id", university)
    .maybeSingle();

  try {
    await sendEmail({
      react: createElement(StudentCodeTemplate, {
        code,
        educator: true,
        locale,
        university: (locale === "ar" ? row?.name_ar : row?.name_en) ?? "",
      }),
      subject: studentCodeSubject(locale, true),
      to: email.trim().toLowerCase(),
    });
  } catch (sendError) {
    log.error(`Educator code email failed: ${parseError(sendError)}`);
    return json({ error: "email_unavailable" }, 503);
  }
  return json({ sent: true });
};
