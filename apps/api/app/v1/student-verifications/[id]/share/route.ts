import { authenticateRequest } from "@repo/auth/verify";
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

const bodySchema = z.object({ locale: localeSchema });

/**
 * One tap: the signed-in Pass holder shares their valid student badge
 * with this partner, and gets the confirmation email.
 */
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { admin, id, json } = await verificationRoute(request, params);
  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }
  const body = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!(id && body.success)) {
    return json({ error: "invalid_request" }, 400);
  }
  const { data, error } = await admin.rpc("share_student_verification", {
    member: session.userId,
    target: id,
  });
  const shared = data?.[0];
  if (error || !shared) {
    return json({ error: verificationError(error?.message) }, 400);
  }
  await emailOutcome(admin, {
    email: shared.email,
    id,
    locale: body.data.locale,
    outcome: "verified",
    token: shared.delete_token,
  });
  await deliverSoon(admin);
  return json({ status: "verified" });
};
