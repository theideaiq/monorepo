import { formatPrice, localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoverImage } from "@/components/cover-image";
import { getCampaign, getCampaignListings, imageUrl } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface CampaignProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

export const generateMetadata = async ({
  params,
}: CampaignProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const campaign = await getCampaign(slug);
  if (!campaign) {
    return {};
  }
  return localizedMetadata(locale, `/store/campaigns/${slug}`, {
    description: localized(campaign, "description", locale),
    title: localized(campaign, "name", locale),
  });
};

/**
 * Store → a seasonal campaign: the shops taking part with their own
 * discount, and their listings at the campaign price, cheapest first.
 */
const CampaignPage = async ({ params }: CampaignProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const campaign = await getCampaign(slug);
  if (!campaign) {
    notFound();
  }
  const [t, conditions, listings] = await Promise.all([
    getTranslations({ locale, namespace: "web.store.campaign" }),
    getTranslations({ locale, namespace: "store.condition" }),
    getCampaignListings(slug),
  ]);
  const shops = [...new Set(listings.map((listing) => listing.seller_name))];
  const description = localized(campaign, "description", locale);

  return (
    <div className="container grid gap-6 py-8">
      <header className="grid gap-2">
        <h1 className="font-semibold text-3xl">
          {localized(campaign, "name", locale)}
        </h1>
        <p className="text-muted-foreground">
          {t("dates", {
            ends: formatDate(campaign.ends_at, locale),
            starts: formatDate(campaign.starts_at, locale),
          })}
        </p>
        {description ? <p className="max-w-2xl">{description}</p> : null}
        {shops.length > 0 ? (
          <p className="text-sm">{t("shops", { shops: shops.join(" · ") })}</p>
        ) : null}
      </header>
      {listings.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((listing) => (
            <li
              className="grid content-start gap-2"
              key={`${listing.variant_id}-${listing.condition}-${listing.seller_id}`}
            >
              <Link
                className="grid gap-2"
                href={`/store/${encodeURIComponent(listing.slug)}`}
              >
                <CoverImage
                  alt={localized(listing, "name", locale)}
                  fit="product"
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  src={imageUrl(listing.images[0]) ?? null}
                />
                <span className="font-medium text-sm">
                  {localized(listing, "name", locale)}
                </span>
              </Link>
              <p className="text-muted-foreground text-xs">
                {conditions(listing.condition)} ·{" "}
                {t("soldBy", { seller: listing.seller_name })}
              </p>
              {/* No struck-through price here: "was" prices are only the
                  honest ones, shown on the product page. */}
              <p className="font-semibold text-sm">
                {formatPrice(listing.price, locale)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CampaignPage;
