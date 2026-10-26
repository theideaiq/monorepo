import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { Send } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubYours } from "@/components/club/club-yours";
import { FeedChips } from "@/components/club/feed-chips";
import { EventCard, PostCard } from "@/components/editorial-cards";
import { LearnPrograms } from "@/components/learn-programs";
import { PageHero } from "@/components/page-hero";
import { PostSubmit } from "@/components/post-submit";
import { EmptyState, Section } from "@/components/section";
import { Rail } from "@/components/shop/rail";
import {
  type ClubFilter,
  filterPath,
  isClubFilter,
  sectionOf,
} from "@/lib/club";
import { getEvents, getPosts } from "@/lib/data";
import { telegram } from "@/lib/links";
import { localizedMetadata } from "@/lib/metadata";

interface ClubProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ show?: string }>;
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

/** The IDEA Club on Telegram: the rooms and the way in. */
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
          <Link className="text-pink-text underline" href="/legal/community">
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

/** Events: upcoming first, then past ones. */
const EventsFeed = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.club" });
  const [upcoming, past] = await Promise.all([
    getEvents({ limit: 48 }),
    getEvents({ limit: 12, past: true }),
  ]);
  return (
    <>
      {upcoming.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((event) => (
            <EventCard event={event} key={event.id} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState>{t("noEvents")}</EmptyState>
      )}
      {past.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h2 className="font-semibold text-xl">{t("pastEvents")}</h2>
          <div className="grid gap-6 opacity-80 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <EventCard event={event} key={event.id} locale={locale} />
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
};

/** Stories, news or guides (or all of them), newest first. */
const PostsFeed = async ({
  filter,
  locale,
}: {
  readonly filter?: Exclude<ClubFilter, "events">;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.club" });
  const posts = await getPosts({
    limit: 60,
    sections: filter
      ? [
          sectionOf(filter),
          ...(filter === "stories" ? ["members" as const] : []),
        ]
      : undefined,
  });
  return posts.length > 0 ? (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <PostCard key={post.id} locale={locale} post={post} />
      ))}
    </div>
  ) : (
    <EmptyState>{t("empty")}</EmptyState>
  );
};

/**
 * The IDEA Club: one feed of events, news, stories and guides, filtered by
 * chips, with the Telegram rooms at the top and, for signed-in members,
 * their own events and submissions.
 */
const Club = async ({ params, searchParams }: ClubProps) => {
  const [{ locale }, { show }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web" });
  const filter = isClubFilter(show) ? show : undefined;
  const upcoming = filter ? [] : await getEvents({ limit: 6 });

  return (
    <>
      <PageHero subtitle={t("club.description")} title={t("club.title")} />
      <Section className="flex flex-col gap-8">
        <TelegramCard locale={locale} />
        <ClubYours />
        <FeedChips current={filter} locale={locale} />
        {filter === "events" ? (
          <EventsFeed locale={locale} />
        ) : (
          <PostsFeed filter={filter} locale={locale} />
        )}
      </Section>
      {upcoming.length > 0 ? (
        <Rail
          action={{ href: filterPath("events"), label: t("ui.viewAll") }}
          title={t("home.events.title")}
        >
          {upcoming.map((event) => (
            <EventCard event={event} key={event.id} locale={locale} />
          ))}
        </Rail>
      ) : null}
      {filter === "guides" ? <LearnPrograms locale={locale} /> : null}
      {!filter || filter === "stories" ? (
        <Section>
          <PostSubmit locale={locale} />
        </Section>
      ) : null}
    </>
  );
};

export default Club;
