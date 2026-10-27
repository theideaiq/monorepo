import { NextResponse } from "next/server";
import { cardSvg } from "@/lib/oidc/card-svg";
import { accessTokenOf } from "@/lib/oidc/clients";

const LABELS = {
  ar: {
    member: "عضو",
    notForScanning: "للعرض فقط",
    since: "عضو منذ",
    student: "طالب",
  },
  en: {
    member: "MEMBER",
    notForScanning: "Not for scanning",
    since: "Member since",
    student: "STUDENT",
  },
} as const;

interface PassCard {
  member_number: number | null;
  name: string | null;
  plan_ar: string | null;
  plan_en: string | null;
  since: string;
  student: boolean;
}

/**
 * The person's The IDEA Pass card for a partner's site (the `card`
 * scope), as an SVG image: name, member number, plan and badges, drawn
 * without the scannable code. `?lang=ar` for Arabic labels. With
 * `Accept: application/json`, the same details as JSON.
 */
export const GET = async (request: Request) => {
  const access = await accessTokenOf(request);
  if (!access?.scopes.includes("card")) {
    return NextResponse.json(
      { error: "invalid_token" },
      {
        headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
        status: 401,
      }
    );
  }
  const { data } = await access.admin.rpc("pass_card", {
    member: access.user_id,
  });
  const card = data as PassCard | null;
  if (!card) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  const arabic = new URL(request.url).searchParams.get("lang") === "ar";
  const details = {
    memberNumber: card.member_number,
    name: card.name ?? "",
    plan: (arabic ? card.plan_ar : card.plan_en) ?? null,
    since: card.since.slice(0, 7),
    student: card.student,
  };
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json(details, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  return new Response(
    cardSvg(details, arabic ? LABELS.ar : LABELS.en, arabic),
    {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'",
        "Content-Type": "image/svg+xml; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
};
