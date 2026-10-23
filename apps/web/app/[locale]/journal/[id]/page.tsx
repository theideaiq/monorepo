import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { FileText, MoveLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoverImage } from "@/components/cover-image";
import { JournalSubmit } from "@/components/journal-submit";
import { editorialUrl, getIssue, getIssues } from "@/lib/data";
import { Markdown, markdownToText } from "@/lib/markdown";
import { localizedMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface IssueProps {
  params: Promise<{ id: string; locale: Locale }>;
}

export const generateStaticParams = async () =>
  (await getIssues()).map(({ id }) => ({ id }));

export const generateMetadata = async ({
  params,
}: IssueProps): Promise<Metadata> => {
  const { id, locale } = await params;
  const issue = await getIssue(id);
  if (!issue) {
    return {};
  }
  return localizedMetadata(locale, `/journal/${id}`, {
    description: markdownToText(localized(issue, "description", locale), 160),
    image: editorialUrl(issue.cover_image),
    title: localized(issue, "title", locale),
  });
};

const Issue = async ({ params }: IssueProps) => {
  const { id, locale } = await params;
  setRequestLocale(locale);
  const issue = await getIssue(id);
  if (!issue?.published_at || new Date(issue.published_at) > new Date()) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const title = localized(issue, "title", locale);
  const description = localized(issue, "description", locale);
  const pdf = editorialUrl(issue.pdf_path);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10">
      <Link
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href="/journal"
      >
        <MoveLeft className="size-4 rtl:rotate-180" />
        {t("back")}
      </Link>
      <div className="grid gap-10 md:grid-cols-[18rem_1fr]">
        <CoverImage
          alt={title}
          className="aspect-[3/4]"
          priority
          sizes="18rem"
          src={editorialUrl(issue.cover_image)}
        />
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            {t("issue", {
              issue: formatNumber(issue.issue, locale),
              volume: formatNumber(issue.volume, locale),
            })}
            {" · "}
            {t("published", { date: formatDate(issue.published_at, locale, "long") })}
          </p>
          <h1 className="text-balance font-bold text-4xl tracking-tight">{title}</h1>
          {description ? (
            <Markdown
              className="prose prose-neutral dark:prose-invert max-w-none"
              source={description}
            />
          ) : null}
          {pdf ? (
            <Button asChild className="w-fit gap-2" size="lg">
              <a href={pdf} rel="noopener noreferrer" target="_blank">
                <FileText className="size-4" />
                {t("read")}
              </a>
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">{t("noPdf")}</p>
          )}
        </div>
      </div>
      <div className="mt-14">
        <JournalSubmit locale={locale} />
      </div>
    </div>
  );
};

export default Issue;
