import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { JsonLd } from "@repo/seo/json-ld";
import { MoveLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CoverImage } from "@/components/cover-image";
import { clubItemPath, topicPath } from "@/lib/club";
import { editorialUrl, getPost } from "@/lib/data";
import { Markdown } from "@/lib/markdown";
import { siteUrl } from "@/lib/metadata";

/** A post: its topics, date, byline, cover and body. */
export const PostArticle = async ({
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
  const t = await getTranslations({ locale, namespace: "web.club" });
  const title = localized(post, "title", locale);
  const excerpt = localized(post, "excerpt", locale);
  const cover = editorialUrl(post.cover_image);
  const topicNames = post.topics.map((tag) => t(`topics.${tag}`));
  const author = post.byline ?? t("theIdea");

  return (
    <article className="container mx-auto max-w-3xl px-4 py-10">
      <JsonLd
        code={{
          "@context": "https://schema.org",
          "@type": post.topics.includes("news") ? "NewsArticle" : "Article",
          articleSection: topicNames,
          author: post.byline
            ? { "@type": "Person", name: post.byline }
            : { "@type": "Organization", name: "The IDEA" },
          dateModified: post.updated_at,
          datePublished: post.published_at,
          headline: title,
          ...(cover ? { image: [cover] } : {}),
          mainEntityOfPage: new URL(
            localePath(locale, clubItemPath(slug)),
            siteUrl()
          ).href,
        }}
      />
      <Link
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href={topicPath()}
      >
        <MoveLeft className="size-4 rtl:rotate-180" />
        {t("backToRead")}
      </Link>
      <header className="mb-8 flex flex-col gap-3">
        <p className="flex flex-wrap items-center gap-x-3 text-muted-foreground text-sm">
          {post.topics.map((tag) => (
            <Link
              className="font-medium text-pink-text hover:underline"
              href={topicPath(tag)}
              key={tag}
            >
              {t(`topics.${tag}`)}
            </Link>
          ))}
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
