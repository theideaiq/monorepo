import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLegalSlug, legalDocuments, readLegalDocument } from "@/lib/legal";
import { Markdown } from "@/lib/markdown";
import { localizedMetadata } from "@/lib/metadata";

// Only the documents in content/legal exist.
export const dynamicParams = false;

interface LegalProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

export const generateStaticParams = () =>
  legalDocuments.map(({ slug }) => ({ slug }));

export const generateMetadata = async ({
  params,
}: LegalProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  if (!isLegalSlug(slug)) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.legal.documents" });
  return localizedMetadata(locale, `/legal/${slug}`, {
    description: t(`${slug}.description`),
    title: t(`${slug}.title`),
  });
};

const Legal = async ({ params }: LegalProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!isLegalSlug(slug)) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.legal" });
  const document = legalDocuments.find((entry) => entry.slug === slug);
  const source = await readLegalDocument(slug, locale);

  return (
    <div className="container mx-auto grid gap-10 px-4 py-12 lg:grid-cols-[14rem_1fr]">
      <nav
        aria-label={t("label")}
        className="flex flex-col gap-1 lg:sticky lg:top-24 lg:h-fit"
      >
        <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {t("label")}
        </p>
        {legalDocuments.map((entry) => (
          <Link
            aria-current={entry.slug === slug ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm hover:bg-muted",
              entry.slug === slug && "bg-muted font-medium"
            )}
            href={`/legal/${entry.slug}`}
            key={entry.slug}
          >
            {t(`documents.${entry.slug}.title`)}
          </Link>
        ))}
      </nav>
      <article className="max-w-3xl">
        <header className="mb-8 flex flex-col gap-2 border-b pb-6">
          <h1 className="font-bold text-4xl tracking-tight">
            {t(`documents.${slug}.title`)}
          </h1>
          {document ? (
            <p className="text-muted-foreground text-sm">
              {t("lastUpdated", {
                date: formatDate(document.updated, locale, "long"),
              })}
            </p>
          ) : null}
        </header>
        <Markdown
          className="prose prose-neutral dark:prose-invert max-w-none"
          locale={locale}
          source={source}
        />
      </article>
    </div>
  );
};

export default Legal;
