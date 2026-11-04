import { formatPrice, localized } from "@repo/commerce";
import type { ProductCard } from "@repo/commerce/catalog";
import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { SwitchOn } from "@repo/design-system/components/brand/switch-on";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { MoveRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Promises } from "@/components/promises";
import { MemberStrip } from "@/components/shop/member-strip";
import { Rail } from "@/components/shop/rail";
import { ShelfTabs } from "@/components/shop/shelf-tabs";
import { CoverCard } from "@/components/store/cover-card";
import { DisplayShelf } from "@/components/store/display-shelf";
import { LiveAuctionsRow, SavedRows } from "@/components/store/for-you-rows";
import {
  getCategories,
  getLiveCampaign,
  getPlans,
  getProducts,
} from "@/lib/data";
import { DISPLAY_MIN, withCovers } from "@/lib/display";
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
 * The Music crate or Books shelf with enough real covers; a plain rail
 * with fewer, nothing with none.
 */
const Display = ({
  href,
  kind,
  products,
  title,
  viewAll,
}: {
  readonly href: string;
  readonly kind: "crate" | "shelf";
  readonly products: ProductCard[];
  readonly title: string;
  readonly viewAll: string;
}) => {
  const covered = withCovers(products);
  if (covered.length >= DISPLAY_MIN) {
    return (
      <DisplayShelf
        action={{ href, label: viewAll }}
        kind={kind}
        products={covered}
        title={title}
      />
    );
  }
  if (products.length === 0) {
    return null;
  }
  return (
    <Rail action={{ href, label: viewAll }} title={title}>
      {products.slice(0, ROW).map((product) => (
        <CoverCard key={product.id} product={product} />
      ))}
    </Rail>
  );
};

/**
 * The Store's "For you" shelf: the positioning and the bulb to switch on (it
 * reveals the brand line, remembered per visitor), then the campaign running now, the member's Bulbs, New this week, the
 * Music crate and Books shelf, the promises, live auctions, more like what they saved, what's in Plus, and
 * the Pink Band to the Plus waitlist (Plus isn't open for joining yet,
 * decision D2 of 4 November 2026).
 */
const Home = async ({ params }: HomeProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web" });
  const [categories, campaign, fresh, inPlus, plans, music, books] =
    await Promise.all([
      getCategories("sale"),
      getLiveCampaign(),
      getProducts({ limit: ROW, since: weekAgo(), sort: "newest" }),
      getProducts({ kind: "rental", limit: ROW, sort: "newest" }),
      getPlans("plus"),
      getProducts({
        category: "music",
        inStock: true,
        limit: 12,
        sort: "newest",
      }),
      getProducts({
        category: "books",
        inStock: true,
        limit: 12,
        sort: "newest",
      }),
    ]);
  const from = cheapestMonthly(plans);

  return (
    <>
      <div className="container mx-auto flex flex-col gap-4 px-4 pt-4 pb-2">
        <section className="flex flex-col items-center gap-2 py-4 text-center md:py-8">
          <SwitchOn hint={t("home.hero.tap")} label={t("home.hero.switchOn")}>
            <p className="font-semibold text-pink-text text-sm">
              {t("home.hero.line")}
            </p>
          </SwitchOn>
          <h1 className="text-balance text-h2 md:text-h1">
            {t("home.hero.title")}{" "}
            <Highlight>{t("home.hero.highlight")}</Highlight>
          </h1>
          <p className="max-w-2xl text-balance text-muted-foreground">
            {t("home.hero.description")}
          </p>
        </section>
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

      <Display
        href="/store/music"
        kind="crate"
        products={music}
        title={t("store.shelf.musicCrate")}
        viewAll={t("ui.viewAll")}
      />
      <Display
        href="/store/books"
        kind="shelf"
        products={books}
        title={t("store.shelf.booksShelf")}
        viewAll={t("ui.viewAll")}
      />

      <div className="container mx-auto px-4 py-6">
        <Promises />
      </div>

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
              {t("home.rent.waitlist")}
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
