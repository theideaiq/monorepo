import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { EventArticle } from "@/components/club/event-article";
import { PostArticle } from "@/components/club/post-article";
import { clubItemPath } from "@/lib/club";
import {
  editorialUrl,
  getEvent,
  getEvents,
  getPost,
  getPosts,
} from "@/lib/data";
import { markdownToText } from "@/lib/markdown";
import { localizedMetadata } from "@/lib/metadata";

export const revalidate = 60;

interface ClubItemProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

// The latest posts and events are built ahead; others on demand.
export const generateStaticParams = async () => [
  ...(await getPosts({ limit: 100 })).map(({ slug }) => ({ slug })),
  ...(await getEvents({ limit: 100 })).map(({ slug }) => ({ slug })),
];

export const generateMetadata = async ({
  params,
}: ClubItemProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const post = await getPost(slug);
  if (post) {
    return localizedMetadata(locale, clubItemPath(slug), {
      description:
        localized(post, "excerpt", locale) ||
        markdownToText(localized(post, "body", locale), 160),
      image: editorialUrl(post.cover_image),
      title: localized(post, "title", locale),
      type: "article",
    });
  }
  const event = await getEvent(slug);
  if (!event) {
    return {};
  }
  return localizedMetadata(locale, clubItemPath(slug), {
    description: markdownToText(localized(event, "description", locale), 160),
    image: editorialUrl(event.cover_image),
    title: localized(event, "title", locale),
  });
};

/** `/club/<slug>`: a story, guide or news item, else an event. */
const ClubItem = async ({ params }: ClubItemProps) => {
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

export default ClubItem;
