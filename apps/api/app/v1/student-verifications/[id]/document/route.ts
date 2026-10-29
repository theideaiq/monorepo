import { uploadStudentDocument } from "@repo/storage";
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

const fieldsSchema = z.object({
  email: z.email().max(254),
  kind: z.enum(["card", "enrollment"]),
  locale: localeSchema,
  university: z.string().min(1).max(40),
});

/**
 * A student card or an enrollment proof (dated within 3 months) for Staff
 * to check, usually within 1 working day; the result goes to the email.
 */
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { admin, id, json } = await verificationRoute(request, params);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const fields = fieldsSchema.safeParse({
    email: form?.get("email"),
    kind: form?.get("kind"),
    locale: form?.get("locale") ?? undefined,
    university: form?.get("university"),
  });
  if (!(id && fields.success && file instanceof File)) {
    return json({ error: "invalid_request" }, 400);
  }
  const { data: open } = await admin
    .from("student_verifications")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (open?.status !== "started") {
    return json({ error: "not_found" }, 404);
  }

  let path: string;
  try {
    ({ path } = await uploadStudentDocument(admin, id, file));
  } catch {
    return json({ error: "invalid_file" }, 400);
  }
  const { error } = await admin.rpc("submit_student_verification_document", {
    address: fields.data.email,
    kind: fields.data.kind,
    path,
    target: id,
    university: fields.data.university,
  });
  if (error) {
    await admin.storage.from("student-documents").remove([path]);
    return json({ error: verificationError(error.message) }, 400);
  }
  await emailOutcome(admin, {
    email: fields.data.email.trim().toLowerCase(),
    id,
    locale: fields.data.locale,
    outcome: "received",
  });
  await deliverSoon(admin);
  return json({ status: "pending" });
};
