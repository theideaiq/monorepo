import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatDateTime } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { clubItemPath } from "@/lib/club";
import { type EventRow, editorialUrl, type PostSummary } from "@/lib/data";
import { CoverImage } from "./cover-image";

const cardClass =
  "group flex w-full flex-col gap-3 rounded-lg border bg-card p-3 transition-shadow hover:shadow-md";

/** A post of The IDEA Club: cover, topics, date, title and excerpt. */
export const PostCard = async ({
  locale,
  post,
}: {
  readonly locale: Locale;
  readonly post: PostSummary;
}) => {
  const t = await getTranslations({ locale, namespace: "web.club" });
  const title = localized(post, "title", locale);
  const excerpt = localized(post, "excerpt", locale);

  return (
    <Link className={cardClass} href={clubItemPath(post.slug)}>
      <CoverImage alt={title} src={editorialUrl(post.cover_image)} />
      <div className="flex flex-col gap-2 px-1 pb-1">
        <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-xs">
          <span className="font-medium text-pink-text">
            {post.topics.map((topic) => t(`topics.${topic}`)).join(" · ")}
          </span>
          {post.published_at ? (
            <time dateTime={post.published_at}>
              {formatDate(post.published_at, locale, "long")}
            </time>
          ) : null}
        </p>
        <h3 className="font-semibold text-lg leading-snug group-hover:text-pink-text">
          {title}
        </h3>
        {excerpt ? (
          <p className="line-clamp-3 text-muted-foreground text-sm">
            {excerpt}
          </p>
        ) : null}
        {post.byline ? (
          <p className="text-muted-foreground text-xs">
            {t("byline", { name: post.byline })}
          </p>
        ) : null}
      </div>
    </Link>
  );
};

export const EventCard = ({
  event,
  locale,
}: {
  readonly event: EventRow;
  readonly locale: Locale;
}) => {
  const title = localized(event, "title", locale);

  return (
    <Link className={cardClass} href={clubItemPath(event.slug)}>
      <CoverImage alt={title} src={editorialUrl(event.cover_image)} />
      <div className="flex flex-col gap-2 px-1 pb-1">
        <h3 className="font-semibold text-lg leading-snug group-hover:text-pink-text">
          {title}
        </h3>
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
          <time dateTime={event.starts_at}>
            {formatDateTime(event.starts_at, locale)}
          </time>
        </p>
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          {event.location}
        </p>
      </div>
    </Link>
  );
};
