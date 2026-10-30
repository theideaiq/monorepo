import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AffiliateLanding } from "@/components/affiliate-landing";
import { affiliateCode } from "@/lib/affiliate-link";

interface AffiliatePageProps {
  params: Promise<{ code: string; locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: AffiliatePageProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.affiliate" });
  return {
    description: t("description"),
    // Partners' links: never indexed.
    robots: { follow: false, index: false },
    title: t("title"),
  };
};

/** theideaiq.com/a/<code>: a partner's link (5% off with their code). */
const AffiliatePage = async ({ params }: AffiliatePageProps) => {
  const { code, locale } = await params;
  setRequestLocale(locale);
  const clean = affiliateCode(decodeURIComponent(code));
  if (!clean) {
    notFound();
  }
  return <AffiliateLanding code={clean} />;
};

export default AffiliatePage;
