import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackToPeople, PeopleListingScreen } from "@/components/store/people";
import { localizedMetadata } from "@/lib/metadata";

interface ListingProps {
  params: Promise<{ locale: Locale; number: string }>;
}

const listingNumber = (value: string) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

export const generateMetadata = async ({
  params,
}: ListingProps): Promise<Metadata> => {
  const { locale, number } = await params;
  const t = await getTranslations({ locale, namespace: "app.people.store" });
  return localizedMetadata(locale, `/store/people/${number}`, {
    description: t("description"),
    title: t("title"),
  });
};

/** Store → From people → one listing; read in the browser. */
const ListingPage = async ({ params }: ListingProps) => {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const found = listingNumber(number);
  if (!found) {
    notFound();
  }
  return (
    <div className="container mx-auto px-4 py-10">
      <BackToPeople />
      <PeopleListingScreen number={found} />
    </div>
  );
};

export default ListingPage;
