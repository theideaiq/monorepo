import { formatPrice, INVITE_DISCOUNT_CAP } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import {
  INVITE_IMAGE_SIZE,
  INVITE_IMAGE_TEXT,
  InviteShareImage,
} from "@/components/invite-share-image";
import { getReferralKind } from "@/lib/data";
import { fittedTextImage, loadBrandFonts, textImage } from "@/lib/og-image";
import { hasArabic } from "@/lib/og-text";

export const revalidate = 3600;

interface ImageParams {
  code: string;
  locale: Locale;
}

/** The invite's share image (A16); none for a code that isn't an invite. */
export const generateImageMetadata = async ({
  params,
}: {
  params: ImageParams;
}) => {
  const kind = await getReferralKind(decodeURIComponent(params.code));
  if (kind !== "invite") {
    return [];
  }
  const t = await getTranslations({
    locale: params.locale,
    namespace: "web.invite",
  });
  return [
    {
      alt: t("title"),
      contentType: "image/png",
      id: "invite",
      size: INVITE_IMAGE_SIZE,
    },
  ];
};

const InviteImage = async ({ params }: { params: Promise<ImageParams> }) => {
  const { code, locale } = await params;
  if ((await getReferralKind(decodeURIComponent(code))) !== "invite") {
    return new Response("Not found", { status: 404 });
  }
  const [t, fonts] = await Promise.all([
    getTranslations({ locale, namespace: "web.invite" }),
    loadBrandFonts(),
  ]);
  const rtl = locale === "ar";
  const color = "#FFFFFF";
  const title = t("title");
  const offer = t("imageOffer", {
    cap: formatPrice(INVITE_DISCOUNT_CAP, locale),
  });
  const { width } = INVITE_IMAGE_TEXT;
  const [titleText, offerText] = await Promise.all([
    hasArabic(title)
      ? fittedTextImage(
          { color, rtl, text: title, weight: 700, width },
          INVITE_IMAGE_TEXT.titleSizes,
          INVITE_IMAGE_TEXT.titleMaxHeight
        ).then((image) => image ?? title)
      : title,
    hasArabic(offer)
      ? textImage({
          color,
          rtl,
          size: INVITE_IMAGE_TEXT.offer,
          text: offer,
          weight: 600,
          width,
        }).then((image) => image ?? offer)
      : offer,
  ]);
  return new ImageResponse(
    <InviteShareImage offer={offerText} rtl={rtl} title={titleText} />,
    { ...INVITE_IMAGE_SIZE, fonts }
  );
};

export default InviteImage;
