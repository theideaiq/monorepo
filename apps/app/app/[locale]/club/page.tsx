import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { MoveRight, Ticket } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { ClubNav, TelegramCard } from "@/components/club/club-nav";
import {
  isFeatured,
  OpportunityCard,
} from "@/components/club/opportunity-card";
import { EventCard, PostCard } from "@/components/editorial-cards";
import { PageHero } from "@/components/page-hero";
import { EmptyState, Section } from "@/components/section";
import { isThisWeek, joinPath, topicPath } from "@/lib/club";
import { getEvents, getOpportunities, getPosts } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";

interface ClubProps {
  params: Promise<{ locale: Locale }>;
}

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

/** A row of cards under its heading, with "See all". */
const Shelf = ({
  all,
  children,
  title,
}: {
  readonly all: { href: string; label: string };
  readonly children: ReactNode;
  readonly title: string;
}) => (
  <section className="flex flex-col gap-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h2 className="font-bold text-2xl tracking-tight">{title}</h2>
      <Link
        className="inline-flex min-h-11 items-center gap-2 font-medium text-pink-text text-sm hover:underline"
        href={all.href}
      >
        {all.label}
        <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </Link>
    </div>
    {children}
  </section>
);

const GRID = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

/**
 * The IDEA Club: what's on this week, featured events and opportunities,
 * the latest reads and the Telegram rooms. Each part has its own page
 * (`/club/events`, `/club/opportunities`, `/club/surveys`, `/club/read`);
 * the member's tickets and applications are in the Pass.
 */
const Club = async ({ params }: ClubProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.club" });
  const [events, opportunities, posts] = await Promise.all([
    getEvents({ limit: 24 }),
    getOpportunities({ limit: 48 }),
    getPosts({ limit: 3 }),
  ]);
  const week = [
    ...events
      .filter((event) => isThisWeek(event.starts_at))
      .map((event) => ({
        at: event.starts_at,
        card: <EventCard event={event} locale={locale} />,
        key: `event-${event.id}`,
      })),
    ...opportunities
      .filter((opportunity) => isThisWeek(opportunity.deadline))
      .map((opportunity) => ({
        at: opportunity.deadline ?? "",
        card: <OpportunityCard locale={locale} opportunity={opportunity} />,
        key: `opportunity-${opportunity.id}`,
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const shown = new Set(week.map((item) => item.key));
  const featuredOpportunities = opportunities
    .filter(isFeatured)
    .filter((opportunity) => !shown.has(`opportunity-${opportunity.id}`))
    .slice(0, 3);
  const nextEvents = events
    .filter((event) => !shown.has(`event-${event.id}`))
    .slice(0, 3);

  return (
    <>
      <PageHero subtitle={t("description")} title={t("title")} />
      <Section className="flex flex-col gap-12">
        <ClubNav current="home" locale={locale} />
        {week.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="font-bold text-2xl tracking-tight">
              {t("pages.home.thisWeek")}
            </h2>
            <ul className={GRID}>
              {week.slice(0, 6).map((item) => (
                <li className="flex" key={item.key}>
                  {item.card}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <Shelf
          all={{ href: joinPath("events"), label: t("pages.home.allEvents") }}
          title={t("pages.home.events")}
        >
          {nextEvents.length > 0 ? (
            <div className={GRID}>
              {nextEvents.map((event) => (
                <EventCard event={event} key={event.id} locale={locale} />
              ))}
            </div>
          ) : (
            <EmptyState>{t("join.empty.events")}</EmptyState>
          )}
        </Shelf>
        {featuredOpportunities.length > 0 ? (
          <Shelf
            all={{
              href: joinPath("opportunities"),
              label: t("pages.home.allOpportunities"),
            }}
            title={t("pages.home.opportunities")}
          >
            <div className={GRID}>
              {featuredOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  locale={locale}
                  opportunity={opportunity}
                />
              ))}
            </div>
          </Shelf>
        ) : null}
        <Shelf
          all={{ href: topicPath(), label: t("pages.home.allReads") }}
          title={t("pages.home.reads")}
        >
          {posts.length > 0 ? (
            <div className={GRID}>
              {posts.map((post) => (
                <PostCard key={post.id} locale={locale} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState>{t("empty")}</EmptyState>
          )}
        </Shelf>
        <Link
          className="flex min-h-11 items-center gap-3 rounded-lg border bg-card p-4 text-sm transition-shadow hover:shadow-2"
          href="/pass/tickets"
        >
          <Ticket aria-hidden="true" className="size-5 text-pink-text" />
          <span className="flex-1">{t("pages.home.yours")}</span>
          <MoveRight
            aria-hidden="true"
            className="size-4 text-muted-foreground rtl:rotate-180"
          />
        </Link>
        <TelegramCard locale={locale} />
      </Section>
    </>
  );
};

export default Club;
