import { createAdminClient } from "@repo/database/admin";
import { deleteStudentDocument } from "@repo/storage";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders, preflight } from "@/lib/cors";
import {
  deliverSoon,
  emailOutcome,
  verificationError,
} from "@/lib/student-verifications";
import { requireStaffCaller } from "../../../_lib/staff";

export const OPTIONS = preflight;

const bodySchema = z.object({
  approve: z.boolean(),
  locale: z.enum(["ar", "en"]).default("en"),
  reason: z.string().max(500).optional(),
});

/**
 * Staff decide a verification document: run as the staff member (the
 * database checks the role), then the student is emailed, the document
 * deleted and the partner told.
 */
export const POST = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const headers = corsHeaders(request);
  const caller = await requireStaffCaller(request, [
    "superadmin",
    "admin",
    "support",
  ]);
  if (caller instanceof NextResponse) {
    return caller;
  }
  const id = z.uuid().safeParse((await params).id);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!(id.success && body.success)) {
    return NextResponse.json(
      { error: "invalid_request" },
      { headers, status: 400 }
    );
  }
  const { data, error } = await caller.supabase.rpc(
    "review_student_verification",
    {
      approve: body.data.approve,
      reason: body.data.reason,
      target: id.data,
    }
  );
  const reviewed = data?.[0];
  if (error || !reviewed) {
    return NextResponse.json(
      { error: verificationError(error?.message) },
      { headers, status: 400 }
    );
  }
  const admin = createAdminClient();
  if (reviewed.document_path) {
    await deleteStudentDocument(admin, reviewed.document_path).catch(
      () => null
    );
  }
  await emailOutcome(admin, {
    email: reviewed.email,
    id: id.data,
    locale: body.data.locale,
    outcome: body.data.approve ? "verified" : "rejected",
    reason: body.data.reason,
    token: reviewed.delete_token,
  });
  await deliverSoon(admin);
  return NextResponse.json({ ok: true }, { headers });
};
