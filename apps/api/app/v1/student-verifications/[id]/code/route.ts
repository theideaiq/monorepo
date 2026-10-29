import { z } from "zod";
import { preflight } from "@/lib/cors";
import {
  localeSchema,
  verificationRoute,
} from "@/lib/student-verification-route";
import {
  deliverSoon,
  emailOutcome,
  verificationError,
} from "@/lib/student-verifications";

export const OPTIONS = preflight;

const bodySchema = z.object({
  code: z.string().regex(/^\d{8}$/),
  locale: localeSchema,
});

/** The emailed code typed back: verified at once, with the confirmation email. */
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { admin, id, json } = await verificationRoute(request, params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!(id && body.success)) {
    return json({ error: "invalid_request" }, 400);
  }
  const { data, error } = await admin.rpc(
    "confirm_student_verification_email",
    { code: body.data.code, target: id }
  );
  const result = data?.[0];
  if (error || !result) {
    return json({ error: verificationError(error?.message) }, 400);
  }
  if (!result.verified) {
    return json({ error: "wrong_code" }, 400);
  }
  await emailOutcome(admin, {
    email: result.email,
    id,
    locale: body.data.locale,
    outcome: "verified",
    token: result.delete_token,
  });
  await deliverSoon(admin);
  return json({ status: "verified" });
};
