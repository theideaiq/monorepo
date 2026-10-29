import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticatePartner } from "@/lib/oidc/clients";
import { partnerView } from "@/lib/student-verifications";

/** The partner reads its verification: the status, the university and the expiry. */
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  const partner = await authenticatePartner(request, new URLSearchParams());
  if (!partner) {
    return NextResponse.json(
      { error: "invalid_client" },
      { headers: { "WWW-Authenticate": "Basic" }, status: 401 }
    );
  }
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { data } = await partner.admin
    .from("student_verifications")
    .select("id, status, university_id, valid_until")
    .eq("id", id.data)
    .eq("client_id", partner.clientId)
    .maybeSingle();
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(partnerView(data));
};
