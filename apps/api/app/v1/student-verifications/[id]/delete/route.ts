import { z } from "zod";
import { preflight } from "@/lib/cors";
import { verificationRoute } from "@/lib/student-verification-route";
import { deliverSoon } from "@/lib/student-verifications";

export const OPTIONS = preflight;

const bodySchema = z.object({ token: z.string().regex(/^[0-9a-f]{48}$/) });

/** "Delete this verification", from the confirmation email; the partner is told. */
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { admin, id, json } = await verificationRoute(request, params);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!(id && body.success)) {
    return json({ error: "invalid_request" }, 400);
  }
  const { data: deleted, error } = await admin.rpc(
    "delete_student_verification",
    { target: id, token: body.data.token }
  );
  if (error) {
    return json({ error: "failed" }, 500);
  }
  if (!deleted) {
    return json({ error: "not_found" }, 404);
  }
  await deliverSoon(admin);
  return json({ deleted: true });
};
