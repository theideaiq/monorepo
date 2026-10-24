import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoverImage } from "@/components/cover-image";
import { JournalSubmit } from "@/components/journal-submit";
import { PageHero } from "@/components/page-hero";
import { EmptyState, Section } from "@/components/section";
import { editorialUrl, getIssues } from "@/lib/data";
import { staticPageMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface JournalProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("journal", "/journal");

const Journal = async ({ params }: JournalProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const issues = await getIssues();

  return (
    <>
      <PageHero subtitle={t("description")} title={t("title")} />
      <Section>
        {issues.length > 0 ? (
          <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {issues.map((issue) => {
              const title = localized(issue, "title", locale);
              return (
                <li key={issue.id}>
                  <Link
                    className="group flex flex-col gap-3"
                    href={`/journal/${issue.id}`}
                  >
                    <CoverImage
                      alt={title}
                      className="aspect-[3/4]"
                      src={editorialUrl(issue.cover_image)}
                    />
                    <p className="text-muted-foreground text-xs">
                      {t("issue", {
                        issue: formatNumber(issue.issue, locale),
                        volume: formatNumber(issue.volume, locale),
                      })}
                    </p>
                    <h2 className="font-semibold group-hover:text-pink-text">
                      {title}
                    </h2>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState>{t("empty")}</EmptyState>
        )}
      </Section>
      <Section>
        <JournalSubmit locale={locale} />
      </Section>
    </>
  );
};

export default Journal;
