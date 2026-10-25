import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { CalendarDays, Newspaper, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventCard, PostCard } from "@/components/editorial-cards";
import { EmptyState } from "@/components/section";
import { Rail } from "@/components/shop/rail";
import { getEvents, getPosts } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface DiscoverProps {
  params: Promise<{ locale: Locale }>;
}

const sections = [
  { href: "/club", icon: Users, id: "club" },
  { href: "/events", icon: CalendarDays, id: "events" },
  { href: "/post", icon: Newspaper, id: "post" },
] as const;

export const generateMetadata = async ({
  params,
}: DiscoverProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.discover.meta" });
  return localizedMetadata(locale, "/discover", {
    description: t("description"),
    title: t("title"),
  });
};

/** The community side of the app: The IDEA Club, events and The IDEA Post. */
const Discover = async ({ params }: DiscoverProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web" });
  const [events, posts] = await Promise.all([
    getEvents({ limit: 4 }),
    getPosts({ limit: 8 }),
  ]);

  return (
    <>
      <div className="container mx-auto flex flex-col gap-4 px-4 pt-6 pb-2">
        <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
          {t("discover.title")}
        </h1>
        <p className="text-muted-foreground">{t("discover.description")}</p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {sections.map(({ href, icon: Icon, id }) => (
            <li key={id}>
              <Link
                className="flex h-full items-start gap-3 rounded-lg border bg-card p-4 transition-shadow hover:shadow-2"
                href={href}
              >
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-6 shrink-0 text-pink-text"
                />
                <span className="flex flex-col gap-1">
                  <span className="font-semibold">{t(`nav.${id}`)}</span>
                  <span className="text-muted-foreground text-sm">
                    {t(`nav.descriptions.${id}`)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {events.length > 0 ? (
        <Rail
          action={{ href: "/events", label: t("ui.viewAll") }}
          title={t("home.events.title")}
        >
          {events.map((event) => (
            <EventCard event={event} key={event.id} locale={locale} />
          ))}
        </Rail>
      ) : (
        <div className="container mx-auto px-4 py-6">
          <EmptyState>{t("home.events.empty")}</EmptyState>
        </div>
      )}

      {posts.length > 0 ? (
        <Rail
          action={{ href: "/post", label: t("ui.viewAll") }}
          title={t("home.news.title")}
        >
          {posts.map((post) => (
            <PostCard key={post.id} locale={locale} post={post} />
          ))}
        </Rail>
      ) : null}
    </>
  );
};

export default Discover;
