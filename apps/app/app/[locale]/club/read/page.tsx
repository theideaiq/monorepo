import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubNav } from "@/components/club/club-nav";
import { FeedChips } from "@/components/club/feed-chips";
import { PostCard } from "@/components/editorial-cards";
import { LearnPrograms } from "@/components/learn-programs";
import { PageHero } from "@/components/page-hero";
import { PostSubmit } from "@/components/post-submit";
import { EmptyState, Section } from "@/components/section";
import { isPostTopic, postTopics, topicPath } from "@/lib/club";
import { getPosts } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";

interface ReadProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ topic?: string }>;
}

export const generateMetadata = async ({
  params,
}: ReadProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "web.club.pages.read",
  });
  return localizedMetadata(locale, topicPath(), {
    description: t("description"),
    title: t("title"),
  });
};

/** `/club/read`: every post, newest first, or one topic (`?topic=`). */
const ReadPage = async ({ params, searchParams }: ReadProps) => {
  const [{ locale }, { topic }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.club" });
  const tag = isPostTopic(topic) ? topic : undefined;
  const posts = await getPosts({ limit: 60, topic: tag });

  return (
    <>
      <PageHero
        subtitle={t("pages.read.description")}
        title={t("pages.read.title")}
      />
      <Section className="flex flex-col gap-8">
        <ClubNav current="read" locale={locale} />
        <FeedChips
          chips={[
            { active: !tag, href: topicPath(), label: t("topics.all") },
            ...postTopics.map((item) => ({
              active: tag === item,
              href: topicPath(item),
              label: t(`topics.${item}`),
            })),
          ]}
          label={t("topics.label")}
        />
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
      {tag === "guides" ? <LearnPrograms locale={locale} /> : null}
      {!tag || tag === "stories" ? (
        <Section>
          <PostSubmit locale={locale} />
        </Section>
      ) : null}
    </>
  );
};

export default ReadPage;
