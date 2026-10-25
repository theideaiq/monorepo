import type { Locale } from "@repo/internationalization";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PostCard } from "@/components/editorial-cards";
import { PageHero } from "@/components/page-hero";
import { PostSections } from "@/components/post-sections";
import { PostSubmit } from "@/components/post-submit";
import { EmptyState, Section } from "@/components/section";
import { getPosts } from "@/lib/data";
import { staticPageMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface ThePostProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("post", "/post");

/** The IDEA Post: everything published, newest first, with its sections. */
const ThePost = async ({ params }: ThePostProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.post" });
  const posts = await getPosts({ limit: 60 });

  return (
    <>
      <PageHero subtitle={t("description")} title={t("title")} />
      <Section className="flex flex-col gap-8">
        <PostSections locale={locale} />
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
      <Section>
        <PostSubmit locale={locale} />
      </Section>
    </>
  );
};

export default ThePost;
