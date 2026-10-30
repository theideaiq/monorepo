import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DuoInvite } from "@/components/plus/duo";

interface DuoInviteProps {
  params: Promise<{ locale: Locale; token: string }>;
}

export const generateMetadata = async ({
  params,
}: DuoInviteProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app.plus.duo" });
  // An invite is for the person it was sent to, not for search.
  return { robots: { follow: false, index: false }, title: t("inviteTitle") };
};

/** An invite to share someone's Plus Duo, opened from their link. */
const DuoInvitePage = async ({ params }: DuoInviteProps) => {
  const { locale, token } = await params;
  setRequestLocale(locale);
  return (
    <div className="container grid max-w-2xl gap-6 py-8">
      <DuoInvite token={decodeURIComponent(token)} />
    </div>
  );
};

export default DuoInvitePage;
