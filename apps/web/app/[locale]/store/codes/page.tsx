import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DigitalCodes } from "@/components/store/digital-codes";

interface CodesProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: CodesProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app.codes" });
  return { description: t("description"), title: t("title") };
};

/** Store → Gift cards and codes: each store's codes, by region. */
const CodesPage = async ({ params }: CodesProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "app.codes" });
  return (
    <div className="container grid gap-6 py-8">
      <header className="grid gap-2">
        <h1 className="font-semibold text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </header>
      <DigitalCodes />
    </div>
  );
};

export default CodesPage;
