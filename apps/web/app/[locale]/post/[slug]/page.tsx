import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { JsonLd } from "@repo/seo/json-ld";
import { MoveLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoverImage } from "@/components/cover-image";
import { PostCard } from "@/components/editorial-cards";
import { LearnPrograms } from "@/components/learn-programs";
import { PageHero } from "@/components/page-hero";
import { PostSections } from "@/components/post-sections";
import { PostSubmit } from "@/components/post-submit";
import { EmptyState, Section } from "@/components/section";
import { editorialUrl, getPost, getPosts } from "@/lib/data";
import { Markdown, markdownToText } from "@/lib/markdown";
import { localizedMetadata, siteUrl } from "@/lib/metadata";
import {
  isPostSection,
  type PostSection,
  postPath,
  postSections,
  sectionPath,
} from "@/lib/post";

export const revalidate = 300;

interface PostPageProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

// The section pages and the latest posts are built ahead; others on demand.
export const generateStaticParams = async () => [
  ...postSections.map((slug) => ({ slug })),
  ...(await getPosts({ limit: 100 })).map(({ slug }) => ({ slug })),
];

export const generateMetadata = async ({
  params,
}: PostPageProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  if (isPostSection(slug)) {
    const t = await getTranslations({ locale, namespace: "web.post" });
    return localizedMetadata(locale, sectionPath(slug), {
      description: t(`sections.${slug}.description`),
      title: `${t(`sections.${slug}.title`)} · ${t("title")}`,
    });
  }
  const post = await getPost(slug);
  if (!post) {
    return {};
  }
  return localizedMetadata(locale, postPath(slug), {
    description:
      localized(post, "excerpt", locale) ||
      markdownToText(localized(post, "body", locale), 160),
    image: editorialUrl(post.cover_image),
    title: localized(post, "title", locale),
    type: "article",
  });
};

/** One section of The IDEA Post: its posts, newest first. */
const SectionPage = async ({
  locale,
  section,
}: {
  readonly locale: Locale;
  readonly section: PostSection;
}) => {
  const t = await getTranslations({ locale, namespace: "web.post" });
  const posts = await getPosts({ limit: 60, section });

  return (
    <>
      <PageHero
        badge={t("title")}
        subtitle={t(`sections.${section}.description`)}
        title={t(`sections.${section}.title`)}
      />
      <Section className="flex flex-col gap-8">
        <PostSections current={section} locale={locale} />
        {posts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} locale={locale} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState>{t("empty")}</EmptyState>
        )}
      </Section>
      {section === "members" ? (
        <Section>
          <PostSubmit locale={locale} />
        </Section>
      ) : null}
      {section === "learn" ? <LearnPrograms locale={locale} /> : null}
    </>
  );
};

/** A post: its section, date, byline, cover and body. */
const Article = async ({
  locale,
  slug,
}: {
  readonly locale: Locale;
  readonly slug: string;
}) => {
  const post = await getPost(slug);
  if (!post?.published_at || new Date(post.published_at) > new Date()) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.post" });
  const title = localized(post, "title", locale);
  const excerpt = localized(post, "excerpt", locale);
  const cover = editorialUrl(post.cover_image);
  const sectionTitle = t(`sections.${post.section}.title`);
  const author = post.byline ?? t("theIdea");

  return (
    <article className="container mx-auto max-w-3xl px-4 py-10">
      <JsonLd
        code={{
          "@context": "https://schema.org",
          "@type": post.section === "news" ? "NewsArticle" : "Article",
          articleSection: sectionTitle,
          author: post.byline
            ? { "@type": "Person", name: post.byline }
            : { "@type": "Organization", name: "The IDEA" },
          dateModified: post.updated_at,
          datePublished: post.published_at,
          headline: title,
          ...(cover ? { image: [cover] } : {}),
          mainEntityOfPage: new URL(
            localePath(locale, postPath(slug)),
            siteUrl()
          ).href,
        }}
      />
      <Link
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href={sectionPath(post.section)}
      >
        <MoveLeft className="size-4 rtl:rotate-180" />
        {t("back", { section: sectionTitle })}
      </Link>
      <header className="mb-8 flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-x-3 text-muted-foreground text-sm">
          <Link
            className="font-medium text-pink-text hover:underline"
            href={sectionPath(post.section)}
          >
            {sectionTitle}
          </Link>
          <time dateTime={post.published_at}>
            {formatDate(post.published_at, locale, "long")}
          </time>
        </p>
        <h1 className="text-balance font-bold text-4xl tracking-tight">
          {title}
        </h1>
        {excerpt ? (
          <p className="text-lg text-muted-foreground">{excerpt}</p>
        ) : null}
        <p className="font-medium text-sm">{t("byline", { name: author })}</p>
      </header>
      {cover ? (
        <CoverImage
          alt={title}
          className="mb-8 aspect-video"
          priority
          sizes="(min-width: 768px) 48rem, 100vw"
          src={cover}
        />
      ) : null}
      <Markdown
        className="prose prose-neutral dark:prose-invert max-w-none"
        locale={locale}
        source={localized(post, "body", locale)}
      />
    </article>
  );
};

/** `/post/<section>` lists a section; `/post/<slug>` is a post. */
const PostPage = async ({ params }: PostPageProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  return isPostSection(slug) ? (
    <SectionPage locale={locale} section={slug} />
  ) : (
    <Article locale={locale} slug={slug} />
  );
};

export default PostPage;
