import { formatPrice, HOUSE_SELLER_ID, localized } from "@repo/commerce";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { CatalogTabs } from "../_components/catalog-tabs";
import { AnswerHouseOfferForm } from "../_components/house-offer-forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.offers");
  return { title: t("title") };
};

const LIMIT = 100;

/**
 * Catalog → Offers: offers on The IDEA's own stock waiting for an answer
 * (48 hours; unanswered ones expire), and the last ones answered. Which
 * listings take offers is set on each product's page.
 */
const OffersPage = async () => {
  const { canWrite, supabase } = await requireSection("catalog");
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog.offers");
  const conditions = await getTranslations("store.condition");
  const format = formatters(locale);

  const columns =
    "id, number, status, amount, buyer_amount, seller_counter, list_price, expires_at, condition, created_at, product:products!inner (id, name_ar, name_en)" as const;
  const [{ data: waiting }, { data: recent }] = await Promise.all([
    supabase
      .from("offers")
      .select(columns)
      .eq("seller_id", HOUSE_SELLER_ID)
      .eq("status", "open")
      .order("expires_at")
      .limit(LIMIT),
    supabase
      .from("offers")
      .select(columns)
      .eq("seller_id", HOUSE_SELLER_ID)
      .neq("status", "open")
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  type Row = NonNullable<typeof waiting>[number];
  const heading = (offer: Row) => (
    <div className="grid gap-1 text-sm">
      <p className="flex flex-wrap items-center gap-2">
        <Link
          className="font-medium hover:underline"
          href={`/catalog/products/${offer.product.id}`}
        >
          {localized(offer.product, "name", locale)}
        </Link>
        <span className="text-muted-foreground">
          · {conditions(offer.condition)} · #{offer.number}
        </span>
        <StatusBadge status={offer.status}>
          {t(`status.${offer.status}`)}
        </StatusBadge>
      </p>
      <p className="text-muted-foreground">
        {t("amounts", {
          offer: formatPrice(offer.amount, locale),
          price: formatPrice(offer.list_price, locale),
        })}
      </p>
    </div>
  );

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <CatalogTabs />
      <PageBody>
        <section className="grid gap-3">
          <h2 className="font-semibold text-lg">{t("waitingTitle")}</h2>
          {(waiting ?? []).length === 0 ? (
            <EmptyState title={t("waitingEmpty")} />
          ) : (
            <ul className="grid gap-3">
              {(waiting ?? []).map((offer) => (
                <li className="grid gap-3 rounded-lg border p-4" key={offer.id}>
                  {heading(offer)}
                  <p className="text-muted-foreground text-xs">
                    {t("answerBy", { time: format.dateTime(offer.expires_at) })}
                  </p>
                  {canWrite ? (
                    <AnswerHouseOfferForm
                      amount={formatPrice(offer.amount, locale)}
                      canCounter={offer.seller_counter === null}
                      id={offer.id}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="grid gap-3">
          <h2 className="font-semibold text-lg">{t("recentTitle")}</h2>
          {(recent ?? []).length === 0 ? (
            <EmptyState title={t("recentEmpty")} />
          ) : (
            <ul className="grid gap-3">
              {(recent ?? []).map((offer) => (
                <li className="rounded-lg border p-4" key={offer.id}>
                  {heading(offer)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageBody>
    </>
  );
};

export default OffersPage;
