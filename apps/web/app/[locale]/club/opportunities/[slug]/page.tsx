import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { OpportunityArticle } from "@/components/club/opportunity-article";
import { opportunityPath } from "@/lib/club";
import { editorialUrl, getOpportunity } from "@/lib/data";
import { markdownToText } from "@/lib/markdown";
import { localizedMetadata } from "@/lib/metadata";

export const revalidate = 60;

interface OpportunityProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

export const generateMetadata = async ({
  params,
}: OpportunityProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const opportunity = await getOpportunity(slug);
  if (!opportunity) {
    return {};
  }
  return localizedMetadata(locale, opportunityPath(slug), {
    description:
      localized(opportunity, "summary", locale) ||
      markdownToText(localized(opportunity, "description", locale), 160),
    image: editorialUrl(opportunity.cover_image),
    title: localized(opportunity, "title", locale),
  });
};

/** `/club/opportunities/<slug>`: a listed (or closed) opportunity. */
const OpportunityPage = async ({ params }: OpportunityProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const opportunity = await getOpportunity(slug);
  if (!opportunity) {
    notFound();
  }
  return <OpportunityArticle locale={locale} opportunity={opportunity} />;
};

export default OpportunityPage;
