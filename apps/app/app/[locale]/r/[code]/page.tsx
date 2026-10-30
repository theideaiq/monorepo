import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InviteLanding } from "@/components/invite-landing";
import { getReferralKind } from "@/lib/data";

interface ReferralPageProps {
  params: Promise<{ code: string; locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: ReferralPageProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.invite" });
  return {
    description: t("description"),
    // Personal links: never indexed.
    robots: { follow: false, index: false },
    title: t("title"),
  };
};

/** theideaiq.com/r/<code>: a friend's invite (10% off the first order). */
const ReferralPage = async ({ params }: ReferralPageProps) => {
  const { code, locale } = await params;
  setRequestLocale(locale);
  const clean = decodeURIComponent(code);
  if ((await getReferralKind(clean)) !== "invite") {
    notFound();
  }
  return <InviteLanding code={clean} />;
};

export default ReferralPage;
