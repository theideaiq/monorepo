import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InviteLanding } from "@/components/invite-landing";

interface InvitePageProps {
  params: Promise<{ code: string; locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: InvitePageProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.invite" });
  return {
    description: t("description"),
    // Personal links: never indexed.
    robots: { follow: false, index: false },
    title: t("title"),
  };
};

/** theideaiq.com/i/<code>: a friend's invite (10% off the first order). */
const InvitePage = async ({ params }: InvitePageProps) => {
  const { code, locale } = await params;
  setRequestLocale(locale);
  return <InviteLanding code={code} />;
};

export default InvitePage;
