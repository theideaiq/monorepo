import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { GiftScreen } from "@/components/screens/gift";
import { SectionSpinner } from "@/components/states";

interface GiftPageProps {
  readonly params: Promise<{ locale: Locale; token: string }>;
}

export const generateMetadata = async ({
  params,
}: GiftPageProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.gift" });
  return {
    // A gift link is for its recipient, not for search.
    robots: { follow: false, index: false },
    title: t("title"),
  };
};

/** /gift/<token>: a gift sent by link, which its recipient claims. */
const GiftPage = async ({ params }: GiftPageProps) => {
  const { locale, token } = await params;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto flex max-w-3xl flex-col px-4 py-6 md:py-10">
      <Suspense fallback={<SectionSpinner />}>
        <GiftScreen token={decodeURIComponent(token)} />
      </Suspense>
    </div>
  );
};

export default GiftPage;
