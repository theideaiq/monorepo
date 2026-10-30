import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LiveAuctions } from "@/components/store/auctions";
import { localizedMetadata } from "@/lib/metadata";

interface AuctionsProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: AuctionsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.store.auctions" });
  return localizedMetadata(locale, "/store/auctions", {
    description: t("description"),
    title: t("title"),
  });
};

/**
 * Store → Auctions: every live auction (signed, limited and rare copies,
 * collectibles), with their current bids and time left.
 */
const AuctionsPage = async ({ params }: AuctionsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.store.auctions" });
  return (
    <div className="container grid gap-6 py-8">
      <header className="grid gap-2">
        <h1 className="font-semibold text-3xl">{t("title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
      </header>
      <LiveAuctions />
    </div>
  );
};

export default AuctionsPage;
