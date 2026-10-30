import { formatPrice, localized } from "@repo/commerce";
import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { MoveRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MemberStrip } from "@/components/shop/member-strip";
import { Rail } from "@/components/shop/rail";
import { ShelfTabs } from "@/components/shop/shelf-tabs";
import { CoverCard } from "@/components/store/cover-card";
import { LiveAuctionsRow, SavedRows } from "@/components/store/for-you-rows";
import {
  getCategories,
  getLiveCampaign,
  getPlans,
  getProducts,
} from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { cheapestMonthly, weekAgo } from "@/lib/plus";

export const revalidate = 300;

const ROW = 8;

interface HomeProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export const generateMetadata = async ({
  params,
}: HomeProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.home.meta" });

  return localizedMetadata(locale, "/", {
    description: t("description"),
    title: t("title"),
  });
};

/**
 * The Store's "For you" shelf: the campaign running now, the member's
 * Bulbs, New this week, live auctions, more like what they saved, what's
 * back in stock, what's in Plus, and the Pink Band to join Plus.
 */
const Home = async ({ params }: HomeProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web" });
  const [categories, campaign, fresh, inPlus, plans] = await Promise.all([
    getCategories("sale"),
    getLiveCampaign(),
    getProducts({ limit: ROW, since: weekAgo(), sort: "newest" }),
    getProducts({ kind: "rental", limit: ROW, sort: "newest" }),
    getPlans("plus"),
  ]);
  const from = cheapestMonthly(plans);

  return (
    <>
      <div className="container mx-auto flex flex-col gap-4 px-4 pt-4 pb-2">
        <h1 className="sr-only">{t("home.title")}</h1>
        <ShelfTabs active="for-you" categories={categories} locale={locale} />
        {campaign ? (
          <Link
            className="group flex flex-col gap-2 rounded-[28px] border bg-surface-raised p-6 shadow-1 transition-shadow hover:shadow-2 md:flex-row md:items-center md:justify-between md:p-8"
            href={`/store/campaigns/${campaign.slug}`}
          >
            <span className="grid gap-1">
              <span className="text-muted-foreground text-sm">
                {t("store.shelf.campaignUntil", {
                  date: formatDate(campaign.ends_at, locale),
                })}
              </span>
              <span className="font-bold text-2xl tracking-tight md:text-3xl">
                <Highlight>{localized(campaign, "name", locale)}</Highlight>
              </span>
              {localized(campaign, "description", locale) ? (
                <span className="text-muted-foreground">
                  {localized(campaign, "description", locale)}
                </span>
              ) : null}
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 font-medium text-pink-text">
              {t("store.shelf.campaignCta")}
              <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
            </span>
          </Link>
        ) : null}
        <MemberStrip />
      </div>

      {fresh.length > 0 ? (
        <Rail
          action={{ href: "/store?sort=newest", label: t("ui.viewAll") }}
          title={t("store.shelf.newThisWeek")}
        >
          {fresh.map((product) => (
            <CoverCard key={product.id} product={product} />
          ))}
        </Rail>
      ) : null}

      <LiveAuctionsRow />
      <SavedRows />

      {inPlus.length > 0 ? (
        <Rail
          action={{ href: "/plus", label: t("ui.viewAll") }}
          title={t("store.shelf.inPlus")}
        >
          {inPlus.map((product) => (
            <CoverCard key={product.id} product={product} />
          ))}
        </Rail>
      ) : null}

      <PinkBand
        action={
          <Button asChild className="gap-2" size="lg" variant="brand">
            <Link href="/plus/plans">
              {t("plus.cta")}
              <MoveRight className="size-4 rtl:rotate-180" />
            </Link>
          </Button>
        }
        className="mt-6"
        description={
          from
            ? t("store.shelf.plusBandFrom", {
                price: formatPrice(from.amount, locale),
              })
            : t("plus.subtitle")
        }
        title={
          <>
            {t("home.rent.title")}{" "}
            <Highlight>{t("home.rent.highlight")}</Highlight>
          </>
        }
      />
    </>
  );
};

export default Home;
