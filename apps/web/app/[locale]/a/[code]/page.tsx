import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AffiliateLanding } from "@/components/affiliate-landing";

interface AffiliatePageProps {
  params: Promise<{ code: string; locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: AffiliatePageProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.affiliateLink" });
  return {
    description: t("description"),
    // Personal links: never indexed.
    robots: { follow: false, index: false },
    title: t("title"),
  };
};

/** theideaiq.com/a/<code>: an affiliate's link (5% off for 30 days). */
const AffiliatePage = async ({ params }: AffiliatePageProps) => {
  const { code, locale } = await params;
  setRequestLocale(locale);
  return <AffiliateLanding code={code} />;
};

export default AffiliatePage;
