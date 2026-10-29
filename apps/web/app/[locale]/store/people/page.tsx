import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PeopleListings } from "@/components/store/people";
import { localizedMetadata } from "@/lib/metadata";

interface PeopleProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: PeopleProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app.people.store" });
  return localizedMetadata(locale, "/store/people", {
    description: t("description"),
    title: t("title"),
  });
};

/**
 * Store → From people: things people sell themselves, paid to them in cash
 * when they meet; the money never passes through The IDEA.
 */
const PeoplePage = async ({ params }: PeopleProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "app.people.store" });
  return (
    <div className="container grid gap-6 py-8">
      <header className="grid gap-2">
        <h1 className="font-semibold text-3xl">{t("title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
      </header>
      <PeopleListings />
    </div>
  );
};

export default PeoplePage;
