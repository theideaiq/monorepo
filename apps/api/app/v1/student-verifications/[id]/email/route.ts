import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { z } from "zod";
import { preflight } from "@/lib/cors";
import {
  localeSchema,
  verificationRoute,
} from "@/lib/student-verification-route";
import {
  emailCode,
  emailReady,
  mayEmailCode,
  verificationError,
} from "@/lib/student-verifications";

export const OPTIONS = preflight;

const bodySchema = z.object({
  email: z.email().max(254),
  locale: localeSchema,
  university: z.string().min(1).max(40),
});

/**
 * Emails an 8-digit code to the university address (no Pass needed): at
 * most 5 codes a day per address.
 */
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { admin, id, json } = await verificationRoute(request, params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!(id && body.success)) {
    return json({ error: "invalid_request" }, 400);
  }
  if (!emailReady()) {
    return json({ error: "email_unavailable" }, 503);
  }
  const email = body.data.email.trim().toLowerCase();
  if (!(await mayEmailCode(email))) {
    return json({ error: "too_many" }, 429);
  }
  const { data: code, error } = await admin.rpc(
    "start_student_verification_email",
    { address: email, target: id, university: body.data.university }
  );
  if (error || !code) {
    return json({ error: verificationError(error?.message) }, 400);
  }
  try {
    await emailCode(admin, { code, email, id, locale: body.data.locale });
  } catch (sendError) {
    log.error(
      `Student verification code email failed: ${parseError(sendError)}`
    );
    return json({ error: "email_unavailable" }, 503);
  }
  return json({ sent: true });
};
