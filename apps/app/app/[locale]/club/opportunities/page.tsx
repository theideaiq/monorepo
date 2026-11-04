import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubNav } from "@/components/club/club-nav";
import {
  isFeatured,
  OpportunityCard,
} from "@/components/club/opportunity-card";
import { OpportunityFiltersForm } from "@/components/club/opportunity-filters";
import { PageHero } from "@/components/page-hero";
import { EmptyState, Section } from "@/components/section";
import {
  byDateOrDeadline,
  joinPath,
  matchesOpportunityFilters,
  opportunityFilters,
} from "@/lib/club";
import { getOpportunities } from "@/lib/data";
import { telegram } from "@/lib/links";
import { localizedMetadata } from "@/lib/metadata";

interface OpportunitiesProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** The most cards on the page at once; the filters narrow down the rest. */
const SHOWN = 96;

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
 * programs, featured first, then by deadline, with filters in the query
 * string (a plain form, so they work without JavaScript).
 */
const OpportunitiesPage = async ({
  params,
  searchParams,
}: OpportunitiesProps) => {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const filters = opportunityFilters(query);
  const [t, tOpportunities, opportunities] = await Promise.all([
    getTranslations({ locale, namespace: "web.club" }),
    getTranslations({ locale, namespace: "web.opportunities" }),
    getOpportunities({ limit: 500 }),
  ]);
  const filtered = Object.values(filters).some((value) => value !== null);
  const ordered = byDateOrDeadline(
    opportunities
      .filter((opportunity) => matchesOpportunityFilters(opportunity, filters))
      .map((opportunity) => ({
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
        <OpportunityFiltersForm
          filters={filters}
          locale={locale}
          opportunities={opportunities}
        />
        {ordered.length > SHOWN ? (
          <p className="text-muted-foreground text-sm">
            {tOpportunities("filters.more", {
              shown: formatNumber(SHOWN, locale),
              total: formatNumber(ordered.length, locale),
            })}
          </p>
        ) : null}
        {ordered.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.slice(0, SHOWN).map(({ key, opportunity }) => (
              <li className="flex" key={key}>
                <OpportunityCard locale={locale} opportunity={opportunity} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            action={
              filtered
                ? undefined
                : {
                    external: true,
                    href: telegram.club,
                    label: t("join.empty.opportunitiesAction"),
                  }
            }
          >
            {filtered
              ? tOpportunities("filters.noMatches")
              : t("join.empty.opportunities")}
          </EmptyState>
        )}
      </Section>
    </>
  );
};

export default OpportunitiesPage;
