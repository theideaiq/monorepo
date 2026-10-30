import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { EventArticle } from "@/components/club/event-article";
import { PostArticle } from "@/components/club/post-article";
import { eventPath, postPath } from "@/lib/club";
import { editorialUrl, getEvent, getPost, getPosts } from "@/lib/data";
import { markdownToText } from "@/lib/markdown";
import { localizedMetadata } from "@/lib/metadata";

export const revalidate = 60;

interface PostProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

// The latest posts are built ahead; others on demand.
export const generateStaticParams = async () =>
  (await getPosts({ limit: 100 })).map(({ slug }) => ({ slug }));

export const generateMetadata = async ({
  params,
}: PostProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (post) {
    return localizedMetadata(locale, postPath(slug), {
      description:
        localized(post, "excerpt", locale) ||
        markdownToText(localized(post, "body", locale), 160),
      image: editorialUrl(post.cover_image),
      title: localized(post, "title", locale),
      type: "article",
    });
  }
  // An old `/club/<slug>` link to an event: its page is the canonical one.
  const event = await getEvent(slug);
  return event
    ? localizedMetadata(locale, eventPath(slug), {
        description: markdownToText(
          localized(event, "description", locale),
          160
        ),
        image: editorialUrl(event.cover_image),
        title: localized(event, "title", locale),
      })
    : {};
};

/**
 * A story, guide or news item (/club/read/[slug]). Old Club links to a
 * slug open here (currentAppPath); one that named an event shows the
 * event, whose own address is under /club/events.
 */
const PostPage = async ({ params }: PostProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (await getPost(slug)) {
    return <PostArticle locale={locale} slug={slug} />;
  }
  const event = await getEvent(slug);
  if (!event) {
    notFound();
  }
  return <EventArticle event={event} locale={locale} />;
};

export default PostPage;
