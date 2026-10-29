import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuctionScreen, BackToAuctions } from "@/components/screens/auction";
import { getAuctionTitle } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";

interface AuctionProps {
  params: Promise<{ locale: Locale; number: string }>;
}

const auctionNumber = (value: string) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

export const generateMetadata = async ({
  params,
}: AuctionProps): Promise<Metadata> => {
  const { locale, number } = await params;
  const found = auctionNumber(number);
  const product = found ? await getAuctionTitle(found) : null;
  if (!product) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.store.auctions" });
  return localizedMetadata(locale, `/store/auctions/${number}`, {
    description: t("one", { name: localized(product, "name", locale) }),
    title: localized(product, "name", locale),
  });
};

/** Store → one auction; its live parts are read in the browser. */
const AuctionPage = async ({ params }: AuctionProps) => {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const found = auctionNumber(number);
  if (!found) {
    notFound();
  }
  return (
    <div className="container mx-auto px-4 py-10">
      <BackToAuctions />
      <AuctionScreen number={found} />
    </div>
  );
};

export default AuctionPage;
