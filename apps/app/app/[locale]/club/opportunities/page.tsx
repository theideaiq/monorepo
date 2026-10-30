import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubNav } from "@/components/club/club-nav";
import {
  isFeatured,
  OpportunityCard,
} from "@/components/club/opportunity-card";
import { PageHero } from "@/components/page-hero";
import { EmptyState, Section } from "@/components/section";
import { byDateOrDeadline, joinPath } from "@/lib/club";
import { getOpportunities } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";

interface OpportunitiesProps {
  params: Promise<{ locale: Locale }>;
}

export const revalidate = 60;

export const generateMetadata = async ({
  params,
}: OpportunitiesProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "web.club.pages.opportunities",
  });
  return localizedMetadata(locale, joinPath("opportunities"), {
    description: t("description"),
    title: t("title"),
  });
};

/**
 * `/club/opportunities`: jobs, internships, scholarships, competitions and
 * programs, featured first, then by deadline.
 */
const OpportunitiesPage = async ({ params }: OpportunitiesProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, opportunities] = await Promise.all([
    getTranslations({ locale, namespace: "web.club" }),
    getOpportunities({ limit: 96 }),
  ]);
  const ordered = byDateOrDeadline(
    opportunities.map((opportunity) => ({
      at: opportunity.deadline,
      key: opportunity.id,
      opportunity,
    }))
  ).sort(
    (a, b) =>
      Number(isFeatured(b.opportunity)) - Number(isFeatured(a.opportunity))
  );

  return (
    <>
      <PageHero
        subtitle={t("pages.opportunities.description")}
        title={t("pages.opportunities.title")}
      />
      <Section className="flex flex-col gap-8">
        <ClubNav current="opportunities" locale={locale} />
        {ordered.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map(({ key, opportunity }) => (
              <li className="flex" key={key}>
                <OpportunityCard locale={locale} opportunity={opportunity} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{t("join.empty.opportunities")}</EmptyState>
        )}
      </Section>
    </>
  );
};

export default OpportunitiesPage;
