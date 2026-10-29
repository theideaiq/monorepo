import { HOUSE_SELLER_ID, localized } from "@repo/commerce";
import { publicFileUrl } from "@repo/storage";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { env } from "@/env";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import {
  HouseAuctionActions,
  MarkReviewButtons,
} from "../_components/auction-forms";
import { CatalogTabs } from "../_components/catalog-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.auctions");
  return { title: t("title") };
};

const COLUMNS =
  "id, number, status, condition, mark, photos, condition_note, start_price, current_price, bid_count, ends_at, final_price, pay_by, second_chance, seller:sellers!inner (id, name, is_house), product:products!inner (id, name_ar, name_en)" as const;

/**
 * Catalog → Auctions: signed, limited and rare marks to review (a wrong one
 * counts against the shop's score), and The IDEA's own auctions with what
 * Staff can do on each. Starting one is on the product's page.
 */
const AuctionsPage = async () => {
  const { canWrite, supabase } = await requireSection("catalog");
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog.auctions");
  const tMarks = await getTranslations("app.auctions.marks");
  const conditions = await getTranslations("store.condition");
  const format = formatters(locale);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  await supabase.rpc("settle_auctions");
  const [{ data: marks }, { data: house }] = await Promise.all([
    supabase
      .from("auctions")
      .select(COLUMNS)
      .not("mark", "is", null)
      .is("mark_review", null)
      .neq("status", "cancelled")
      .order("created_at")
      .limit(50),
    supabase
      .from("auctions")
      .select(COLUMNS)
      .eq("seller_id", HOUSE_SELLER_ID)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  type Row = NonNullable<typeof marks>[number];
  const heading = (auction: Row) => (
    <div className="grid gap-1 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <Link
          className="font-medium hover:underline"
          href={`/catalog/products/${auction.product.id}`}
        >
          {localized(auction.product, "name", locale)}
        </Link>
        <span className="text-muted-foreground">
          · {conditions(auction.condition)}
          {auction.mark ? ` · ${tMarks(auction.mark)}` : ""} · #{auction.number}
        </span>
        <StatusBadge status={auction.status}>
          {t(`status.${auction.status}`)}
        </StatusBadge>
      </p>
      <p className="text-muted-foreground">
        {auction.seller.is_house
          ? t("theIdea")
          : t("shop", { name: auction.seller.name })}{" "}
        ·{" "}
        {auction.bid_count > 0
          ? t("current", {
              amount: format.money(auction.current_price),
              bids: format.number(auction.bid_count),
            })
          : t("starts", { amount: format.money(auction.start_price) })}
      </p>
      {auction.status === "live" ? (
        <p className="text-muted-foreground text-xs">
          {t("endsAt", { time: format.dateTime(auction.ends_at) })}
        </p>
      ) : null}
      {auction.status === "won" ? (
        <p className="text-muted-foreground text-xs">
          {t("payBy", {
            amount: format.money(auction.final_price),
            time: format.dateTime(auction.pay_by),
          })}
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <CatalogTabs />
      <PageBody>
        <section className="grid gap-3">
          <h2 className="font-semibold text-lg">{t("marksTitle")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("marksDescription")}
          </p>
          {(marks ?? []).length === 0 ? (
            <EmptyState title={t("marksEmpty")} />
          ) : (
            <ul className="grid gap-3">
              {(marks ?? []).map((auction) => (
                <li
                  className="grid gap-3 rounded-lg border p-4"
                  key={auction.id}
                >
                  {heading(auction)}
                  <ul className="flex flex-wrap gap-2">
                    {auction.photos.map((path, index) => (
                      <li key={path}>
                        <a
                          className="text-pink-text text-sm hover:underline"
                          href={publicFileUrl(
                            supabaseUrl,
                            "auction-photos",
                            path
                          )}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {t("photo", { number: format.number(index + 1) })}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p className="whitespace-pre-line text-sm">
                    {auction.condition_note}
                  </p>
                  {canWrite ? <MarkReviewButtons id={auction.id} /> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="grid gap-3">
          <h2 className="font-semibold text-lg">{t("houseTitle")}</h2>
          {(house ?? []).length === 0 ? (
            <EmptyState title={t("houseEmpty")} />
          ) : (
            <ul className="grid gap-3">
              {(house ?? []).map((auction) => (
                <li
                  className="grid gap-3 rounded-lg border p-4"
                  key={auction.id}
                >
                  {heading(auction)}
                  {canWrite ? (
                    <HouseAuctionActions
                      bids={auction.bid_count}
                      id={auction.id}
                      secondChance={auction.second_chance}
                      status={auction.status}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageBody>
    </>
  );
};

export default AuctionsPage;
