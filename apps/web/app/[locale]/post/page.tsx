import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { MoveRight, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventCard, PostCard } from "@/components/editorial-cards";
import { PageHero } from "@/components/page-hero";
import { PostSections } from "@/components/post-sections";
import { PostSubmit } from "@/components/post-submit";
import { EmptyState, Section } from "@/components/section";
import { Rail } from "@/components/shop/rail";
import { getEvents, getPosts } from "@/lib/data";
import { staticPageMetadata } from "@/lib/metadata";
import { eventsPath } from "@/lib/post";

export const revalidate = 300;

interface ThePostProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("post", "/post");

/**
 * Discover: The IDEA Post. Its sections, the next events, The IDEA Club on
 * Telegram, then everything published, newest first.
 */
const ThePost = async ({ params }: ThePostProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web" });
  const [events, posts] = await Promise.all([
    getEvents({ limit: 6 }),
    getPosts({ limit: 60 }),
  ]);

  return (
    <>
      <PageHero subtitle={t("post.description")} title={t("post.title")} />
      <div className="container mx-auto px-4">
        <PostSections locale={locale} />
      </div>

      {events.length > 0 ? (
        <Rail
          action={{ href: eventsPath, label: t("ui.viewAll") }}
          title={t("home.events.title")}
        >
          {events.map((event) => (
            <EventCard event={event} key={event.id} locale={locale} />
          ))}
        </Rail>
      ) : null}

      <section className="container mx-auto px-4 py-6">
        <Link
          className="group flex flex-col gap-3 rounded-lg border bg-surface-raised p-6 shadow-1 transition-shadow hover:shadow-2 md:flex-row md:items-center md:justify-between"
          href="/club"
        >
          <span className="flex items-start gap-3">
            <Users
              aria-hidden="true"
              className="mt-0.5 size-6 shrink-0 text-pink-text"
            />
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{t("nav.club")}</span>
              <span className="text-muted-foreground text-sm">
                {t("nav.descriptions.club")}
              </span>
            </span>
          </span>
          <span className="inline-flex items-center gap-2 font-medium text-pink-text">
            {t("post.club")}
            <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </span>
        </Link>
      </section>

      <Section>
        {posts.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} locale={locale} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState>{t("post.empty")}</EmptyState>
        )}
      </Section>
      <Section>
        <PostSubmit locale={locale} />
      </Section>
    </>
  );
};

export default ThePost;
