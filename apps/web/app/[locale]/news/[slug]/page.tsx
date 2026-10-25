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
import { editorialUrl, getPost, getPosts } from "@/lib/data";
import { Markdown, markdownToText } from "@/lib/markdown";
import { localizedMetadata, siteUrl } from "@/lib/metadata";

export const revalidate = 300;

interface PostProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

export const generateStaticParams = async () =>
  (await getPosts(100)).map(({ slug }) => ({ slug }));

export const generateMetadata = async ({
  params,
}: PostProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return {};
  }
  return localizedMetadata(locale, `/news/${slug}`, {
    description:
      localized(post, "excerpt", locale) ||
      markdownToText(localized(post, "body", locale), 160),
    image: editorialUrl(post.cover_image),
    title: localized(post, "title", locale),
    type: "article",
  });
};

const Post = async ({ params }: PostProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = await getPost(slug);
  if (!post?.published_at || new Date(post.published_at) > new Date()) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.news" });
  const title = localized(post, "title", locale);
  const cover = editorialUrl(post.cover_image);

  return (
    <article className="container mx-auto max-w-3xl px-4 py-10">
      <JsonLd
        code={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          dateModified: post.updated_at,
          datePublished: post.published_at,
          headline: title,
          ...(cover ? { image: [cover] } : {}),
          mainEntityOfPage: new URL(
            localePath(locale, `/news/${slug}`),
            siteUrl()
          ).href,
        }}
      />
      <Link
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href="/news"
      >
        <MoveLeft className="size-4 rtl:rotate-180" />
        {t("back")}
      </Link>
      <header className="mb-8 flex flex-col gap-3">
        <time
          className="text-muted-foreground text-sm"
          dateTime={post.published_at}
        >
          {formatDate(post.published_at, locale, "long")}
        </time>
        <h1 className="text-balance font-bold text-4xl tracking-tight">
          {title}
        </h1>
        {localized(post, "excerpt", locale) ? (
          <p className="text-lg text-muted-foreground">
            {localized(post, "excerpt", locale)}
          </p>
        ) : null}
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

export default Post;
