import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatTime } from "@repo/internationalization/format";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import {
  EVENT_IMAGE_SIZE,
  EventShareImage,
} from "@/components/club/event-share-image";
import { editorialUrl, getEvent } from "@/lib/data";
import { eventImageProps } from "@/lib/event-image";
import { loadBrandFonts } from "@/lib/og-image";

export const revalidate = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

interface ImageParams {
  locale: Locale;
  slug: string;
}

/**
 * The event's share image (Open Graph, and X through og:image): it replaces
 * the cover `generateMetadata` used to pass, since file-based metadata wins.
 * None for an event that isn't published.
 */
export const generateImageMetadata = async ({
  params,
}: {
  params: ImageParams;
}) => {
  const event = await getEvent(params.slug);
  return event
    ? [
        {
          alt: localized(event, "title", params.locale),
          contentType: "image/png",
          id: "event",
          size: EVENT_IMAGE_SIZE,
        },
      ]
    : [];
};

const EventImage = async ({ params }: { params: Promise<ImageParams> }) => {
  const { locale, slug } = await params;
  const event = await getEvent(slug);
  if (!event) {
    return new Response("Not found", { status: 404 });
  }
  const [t, fonts] = await Promise.all([
    getTranslations({ locale, namespace: "web.events.image" }),
    loadBrandFonts(),
  ]);

  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : null;
  const sameDay = end && end.getTime() - start.getTime() < DAY_MS;
  let time = formatTime(start, locale);
  if (end) {
    time = t("range", {
      end: sameDay
        ? formatTime(end, locale)
        : t("dateTime", {
            date: formatDate(end, locale, "long"),
            time: formatTime(end, locale),
          }),
      start: time,
    });
  }

  const props = await eventImageProps({
    coverUrl: editorialUrl(event.cover_image),
    date: formatDate(start, locale, "full"),
    location: event.location || null,
    rtl: locale === "ar",
    time: t("time", { time }),
    title: localized(event, "title", locale),
  });

  return new ImageResponse(<EventShareImage {...props} />, {
    ...EVENT_IMAGE_SIZE,
    fonts,
  });
};

export default EventImage;
