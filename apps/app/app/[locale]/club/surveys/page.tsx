import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubNav } from "@/components/club/club-nav";
import { JoinFeed } from "@/components/club/join-feed";
import { PageHero } from "@/components/page-hero";
import { Section } from "@/components/section";
import { applicationsPath, joinPath } from "@/lib/club";
import { localizedMetadata } from "@/lib/metadata";

interface SurveysProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: SurveysProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "web.club.pages.surveys",
  });
  return localizedMetadata(locale, joinPath("surveys"), {
    description: t("description"),
    title: t("title"),
  });
};

/**
 * `/club/surveys`: the surveys the member can answer (signed in), by
 * deadline; the ones they made are in Pass → Applications.
 */
const SurveysPage = async ({ params }: SurveysProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.club.pages" });
  return (
    <>
      <PageHero
        subtitle={t("surveys.description")}
        title={t("surveys.title")}
      />
      <Section className="flex flex-col gap-8">
        <ClubNav current="surveys" locale={locale} />
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/club/surveys/new">{t("surveys.create")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={applicationsPath("surveys")}>{t("surveys.yours")}</Link>
          </Button>
        </div>
        <JoinFeed events={[]} filter="surveys" />
      </Section>
    </>
  );
};

export default SurveysPage;
