import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatePartner } from "@/lib/oidc/clients";
import {
  partnerView,
  verificationError,
  verifyUrl,
} from "@/lib/student-verifications";

const bodySchema = z.object({ return_url: z.url().max(1000) });

/**
 * A partner's backend starts a student verification, with its Sign in
 * with The IDEA Pass app credentials (HTTP Basic). It sends the student to
 * the returned `url`; they come back to `return_url` afterwards.
 */
export const POST = async (request: Request) => {
  const partner = await authenticatePartner(request, new URLSearchParams());
  if (!partner) {
    return NextResponse.json(
      { error: "invalid_client" },
      { headers: { "WWW-Authenticate": "Basic" }, status: 401 }
    );
  }
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { data: id, error } = await partner.admin.rpc(
    "create_student_verification",
    { client: partner.clientId, return_url: body.data.return_url }
  );
  if (error || !id) {
    return NextResponse.json(
      { error: verificationError(error?.message) },
      { status: 400 }
    );
  }
  return NextResponse.json(
    {
      ...partnerView({
        id,
        status: "started",
        university_id: null,
        valid_until: null,
      }),
      url: verifyUrl(id),
    },
    { status: 201 }
  );
};
