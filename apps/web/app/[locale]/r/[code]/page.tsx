import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AffiliateLanding } from "@/components/affiliate-landing";
import { InviteLanding } from "@/components/invite-landing";
import { getReferralKind } from "@/lib/data";

interface ReferralPageProps {
  params: Promise<{ code: string; locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: ReferralPageProps): Promise<Metadata> => {
  const { code, locale } = await params;
  const kind = await getReferralKind(decodeURIComponent(code));
  const t = await getTranslations({
    locale,
    namespace: kind === "affiliate" ? "web.affiliateLink" : "web.invite",
  });
  return {
    description: t("description"),
    // Personal links: never indexed.
    robots: { follow: false, index: false },
    title: t("title"),
  };
};

/**
 * theideaiq.com/r/<code>: a friend's invite (10% off the first order) or an
 * affiliate's link (5% off for 30 days), whichever the code is.
 */
const ReferralPage = async ({ params }: ReferralPageProps) => {
  const { code, locale } = await params;
  setRequestLocale(locale);
  const clean = decodeURIComponent(code);
  const kind = await getReferralKind(clean);
  if (kind === "affiliate") {
    return <AffiliateLanding code={clean} />;
  }
  if (kind === "invite") {
    return <InviteLanding code={clean} />;
  }
  notFound();
};

export default ReferralPage;
