import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatTime } from "@repo/internationalization/format";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import {
  EVENT_IMAGE_SIZE,
  EventShareImage,
} from "@/components/club/event-share-image";
import { getAuctionShare, imageUrl } from "@/lib/data";
import { eventImageProps } from "@/lib/event-image";
import { loadBrandFonts } from "@/lib/og-image";

export const revalidate = 60;

interface ImageParams {
  locale: Locale;
  number: string;
}

const auctionNumber = (value: string) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

const findAuction = async (value: string) => {
  const number = auctionNumber(value);
  return number ? await getAuctionShare(number) : null;
};

/**
 * C9: an auction's share image, drawn like a Club event's under The IDEA
 * Store's lock-up: the product's
 * name and picture, and when the auction ends (Baghdad time). No prices,
 * which change with every bid.
 */
export const generateImageMetadata = async ({
  params,
}: {
  params: ImageParams;
}) => {
  const auction = await findAuction(params.number);
  return auction?.product
    ? [
        {
          alt: localized(auction.product, "name", params.locale),
          contentType: "image/png",
          id: "auction",
          size: EVENT_IMAGE_SIZE,
        },
      ]
    : [];
};

const AuctionImage = async ({ params }: { params: Promise<ImageParams> }) => {
  const { locale, number } = await params;
  const auction = await findAuction(number);
  if (!auction?.product) {
    return new Response("Not found", { status: 404 });
  }
  const [t, fonts] = await Promise.all([
    getTranslations({ locale, namespace: "web.store.auctions.image" }),
    loadBrandFonts(),
  ]);
  const props = await eventImageProps({
    coverUrl: imageUrl(auction.product.images[0]),
    date: t("ends", { date: formatDate(auction.ends_at, locale, "full") }),
    location: null,
    rtl: locale === "ar",
    time: t("time", { time: formatTime(auction.ends_at, locale) }),
    title: localized(auction.product, "name", locale),
  });
  return new ImageResponse(<EventShareImage {...props} line="Store" />, {
    ...EVENT_IMAGE_SIZE,
    fonts,
  });
};

export default AuctionImage;
