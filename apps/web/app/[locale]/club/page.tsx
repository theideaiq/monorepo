import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { Send } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubYours } from "@/components/club/club-yours";
import { FeedChips } from "@/components/club/feed-chips";
import { JoinFeed } from "@/components/club/join-feed";
import {
  isFeatured,
  OpportunityCard,
} from "@/components/club/opportunity-card";
import { EventCard, PostCard } from "@/components/editorial-cards";
import { LearnPrograms } from "@/components/learn-programs";
import { PageHero } from "@/components/page-hero";
import { PostSubmit } from "@/components/post-submit";
import { EmptyState, Section } from "@/components/section";
import {
  isJoinFilter,
  isPostTopic,
  type JoinFilter,
  joinFilters,
  joinPath,
  type PostTopic,
  postTopics,
  topicPath,
} from "@/lib/club";
import { getEvents, getOpportunities, getPosts } from "@/lib/data";
import { telegram } from "@/lib/links";
import { localizedMetadata } from "@/lib/metadata";

interface ClubProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ show?: string; tab?: string; topic?: string }>;
}

/** The rooms, as on Telegram (topics of The IDEA Club group). */
const rooms = [
  "stage",
  "lounge",
  "arcade",
  "vibe",
  "library",
  "studio",
  "office",
] as const;

export const generateMetadata = async ({
  params,
}: ClubProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.club.meta" });
  return localizedMetadata(locale, "/club", {
    description: t("description"),
    title: t("title"),
  });
};

/** The IDEA Club on Telegram: the rooms and the way in, as one card. */
const TelegramCard = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.club.telegram" });
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-surface-raised p-6 shadow-1 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold text-lg">{t("title")}</h2>
        <p className="max-w-2xl text-muted-foreground text-sm">
          {t("description")}
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {rooms.map((room) => (
            <li
              className="rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground text-xs"
              key={room}
            >
              {t(`rooms.${room}`)}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          {t("guidelines")}{" "}
          <Link className="text-pink-text underline" href="/legal/club">
            {t("guidelinesLink")}
          </Link>
        </p>
      </div>
      <Button asChild className="shrink-0 gap-2">
        <a href={telegram.club} rel="noopener noreferrer" target="_blank">
          <Send className="size-4" />
          {t("join")}
        </a>
      </Button>
    </section>
  );
};

/** Join · Read · Yours: where each part of the page starts. */
const ClubNav = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.club.parts" });
  const parts = ["join", "read", "yours"] as const;
  return (
    <nav aria-label={t("label")}>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 border-b pb-3">
        {parts.map((part) => (
          <li key={part}>
            <a
              className="font-semibold text-muted-foreground hover:text-foreground"
              href={`#${part}`}
            >
              {t(part)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

/**
 * Join: upcoming events, opportunities (featured first) and the member's
 * surveys, by date or deadline.
 */
const Join = async ({
  filter,
  locale,
}: {
  readonly filter?: JoinFilter;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.club" });
  const [upcoming, past, opportunities] = await Promise.all([
    filter && filter !== "events" ? [] : getEvents({ limit: 48 }),
    filter === "events" ? getEvents({ limit: 12, past: true }) : [],
    filter && filter !== "opportunities" ? [] : getOpportunities({ limit: 48 }),
  ]);
  return (
    <section className="flex scroll-mt-24 flex-col gap-4" id="join">
      <div className="flex flex-col gap-1">
        <h2 className="font-bold text-2xl">{t("parts.join")}</h2>
        <p className="text-muted-foreground text-sm">{t("join.description")}</p>
      </div>
      <FeedChips
        chips={[
          { active: !filter, href: joinPath(), label: t("join.all") },
          ...joinFilters.map((kind) => ({
            active: filter === kind,
            href: joinPath(kind),
            label: t(`join.${kind}`),
          })),
        ]}
        label={t("join.label")}
      />
      <JoinFeed
        events={[
          ...upcoming.map((event) => ({
            at: event.starts_at,
            card: <EventCard event={event} locale={locale} />,
            key: `event-${event.id}`,
          })),
          ...opportunities.map((opportunity) => ({
            at: opportunity.deadline,
            card: <OpportunityCard locale={locale} opportunity={opportunity} />,
            featured: isFeatured(opportunity),
            key: `opportunity-${opportunity.id}`,
          })),
        ]}
        filter={filter}
      />
      {past.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold text-xl">{t("pastEvents")}</h3>
          <div className="grid gap-6 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <EventCard event={event} key={event.id} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

/** Read: every post, newest first, or one topic. */
const Read = async ({
  locale,
  topic,
}: {
  readonly locale: Locale;
  readonly topic?: PostTopic;
}) => {
  const t = await getTranslations({ locale, namespace: "web.club" });
  const posts = await getPosts({ limit: 60, topic });
  return (
    <section className="flex scroll-mt-24 flex-col gap-4" id="read">
      <h2 className="font-bold text-2xl">{t("parts.read")}</h2>
      <FeedChips
        chips={[
          { active: !topic, href: topicPath(), label: t("topics.all") },
          ...postTopics.map((tag) => ({
            active: topic === tag,
            href: topicPath(tag),
            label: t(`topics.${tag}`),
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
    </section>
  );
};

/**
 * The IDEA Club: Join (events and surveys, by date or deadline), Read
 * (posts by topic) and Yours (the member's tickets, surveys and
 * submissions), with the Telegram rooms at the bottom.
 */
const Club = async ({ params, searchParams }: ClubProps) => {
  const [{ locale }, { show, tab, topic }] = await Promise.all([
    params,
    searchParams,
  ]);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web" });
  const filter = isJoinFilter(show) ? show : undefined;
  const tag = isPostTopic(topic) ? topic : undefined;

  return (
    <>
      <PageHero subtitle={t("club.description")} title={t("club.title")} />
      <Section className="flex flex-col gap-12">
        <ClubNav locale={locale} />
        <Join filter={filter} locale={locale} />
        <Read locale={locale} topic={tag} />
      </Section>
      {tag === "guides" ? <LearnPrograms locale={locale} /> : null}
      {!tag || tag === "stories" ? (
        <Section>
          <PostSubmit locale={locale} />
        </Section>
      ) : null}
      <Section className="flex flex-col gap-12">
        <ClubYours tab={tab} />
        <TelegramCard locale={locale} />
      </Section>
    </>
  );
};

export default Club;
