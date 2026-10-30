import { isLocale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { getFeedProducts, imageUrl } from "@/lib/data";
import { siteUrl } from "@/lib/metadata";
import { productFeedXml } from "@/lib/product-feed";

export const revalidate = 3600;

/**
 * The product feed for Meta's catalog (and Google Merchant Center once it
 * serves Iraq): `/feeds/products.xml` in English, `?lang=ar` in Arabic.
 */
export const GET = async (request: Request) => {
  const lang = new URL(request.url).searchParams.get("lang") ?? "en";
  const locale = isLocale(lang) ? lang : "en";
  const t = await getTranslations({ locale, namespace: "web.feed" });
  const xml = productFeedXml(await getFeedProducts(), {
    imageUrl: (path) => imageUrl(path),
    locale,
    siteUrl: siteUrl().origin,
    title: t("title"),
  });
  return new Response(xml, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
