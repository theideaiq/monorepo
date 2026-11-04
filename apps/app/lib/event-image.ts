import "server-only";
import {
  EVENT_IMAGE_COLORS,
  EVENT_IMAGE_COVER,
  EVENT_IMAGE_TEXT,
  type EventShareImageProps,
  eventImageWidths,
} from "@/components/club/event-share-image";
import { coverDataUrl, fittedTextImage, textImage } from "@/lib/og-image";
import { clampText, hasArabic } from "@/lib/og-text";

export interface EventImageInput {
  coverUrl: string | null;
  date: string;
  location: string | null;
  rtl: boolean;
  time: string;
  title: string;
}

/**
 * The props of `EventShareImage`: the cover fetched and sized, long text
 * shortened, and any text with Arabic in it drawn by Pango (`textImage`),
 * falling back to the string when that fails.
 */
export const eventImageProps = async ({
  coverUrl,
  date,
  location,
  rtl,
  time,
  title,
}: EventImageInput): Promise<EventShareImageProps> => {
  const cover = await coverDataUrl(coverUrl, EVENT_IMAGE_COVER);
  const widths = eventImageWidths(Boolean(cover));
  const color = EVENT_IMAGE_COLORS.white;
  const shortTitle = clampText(title, cover ? 70 : 96);
  const place = location ? clampText(location, cover ? 34 : 60) : null;

  const detail = async (text: string, weight: 400 | 600) =>
    hasArabic(text)
      ? ((await textImage({
          color,
          rtl,
          size: EVENT_IMAGE_TEXT.detail,
          text,
          weight,
          width: widths.detail,
        })) ?? text)
      : text;

  const [titleText, dateText, timeText, placeText] = await Promise.all([
    hasArabic(shortTitle)
      ? fittedTextImage(
          { color, rtl, text: shortTitle, weight: 700, width: widths.title },
          EVENT_IMAGE_TEXT.titleSizes,
          EVENT_IMAGE_TEXT.titleMaxHeight
        ).then((image) => image ?? shortTitle)
      : shortTitle,
    detail(date, 600),
    detail(time, 400),
    place ? detail(place, 400) : null,
  ]);

  return {
    cover,
    date: dateText,
    location: placeText,
    rtl,
    time: timeText,
    title: titleText,
  };
};
