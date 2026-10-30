import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DuoInvite } from "@/components/plus/duo";

interface FamilyInviteProps {
  params: Promise<{ locale: Locale; code: string }>;
}

export const generateMetadata = async ({
  params,
}: FamilyInviteProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app.plus.duo" });
  // An invite is for the person it was sent to, not for search.
  return { robots: { follow: false, index: false }, title: t("inviteTitle") };
};

/** `/family/<code>`: an invite to share someone's Plus as their Family partner. */
const FamilyInvitePage = async ({ params }: FamilyInviteProps) => {
  const { code, locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="container grid max-w-2xl gap-6 py-8">
      <DuoInvite token={decodeURIComponent(code)} />
    </div>
  );
};

export default FamilyInvitePage;
