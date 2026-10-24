import type { Locale } from "@repo/internationalization";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PostCard } from "@/components/editorial-cards";
import { PageHero } from "@/components/page-hero";
import { EmptyState, Section } from "@/components/section";
import { getPosts } from "@/lib/data";
import { staticPageMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface NewsProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("news", "/news");

const News = async ({ params }: NewsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.news" });
  const posts = await getPosts(60);

  return (
    <>
      <PageHero subtitle={t("description")} title={t("title")} />
      <Section>
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
    </>
  );
};

export default News;
