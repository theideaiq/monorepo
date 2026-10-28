import { localized } from "@repo/commerce";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { CampaignForm } from "../_components/campaign-form";
import { CatalogTabs } from "../_components/catalog-tabs";
import { deleteCampaign, setCampaignPublished } from "../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.campaigns");
  return { title: t("title") };
};

/**
 * Catalog → Campaigns: seasonal campaigns, newest first, with the shops
 * taking part and their discounts. Shops opt in from Partners once a
 * campaign is published; it runs and ends by its dates.
 */
const CampaignsPage = async () => {
  const { canWrite, supabase } = await requireSection("catalog");
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog.campaigns");
  const format = formatters(locale);

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      "id, slug, name_en, name_ar, starts_at, ends_at, published, entries:campaign_entries (discount_rate, seller:sellers (name))"
    )
    .order("starts_at", { ascending: false })
    .limit(50);
  const now = new Date().toISOString();

  const stateOf = (campaign: NonNullable<typeof campaigns>[number]) => {
    if (!campaign.published) {
      return "draft";
    }
    if (campaign.ends_at <= now) {
      return "ended";
    }
    return campaign.starts_at <= now ? "running" : "upcoming";
  };

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <CatalogTabs />
      <PageBody>
        {canWrite ? (
          <section className="grid gap-3 rounded-lg border p-4">
            <h2 className="font-semibold text-lg">{t("newTitle")}</h2>
            <CampaignForm />
          </section>
        ) : null}
        {(campaigns ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <ul className="grid gap-3">
            {(campaigns ?? []).map((campaign) => (
              <li
                className="grid gap-2 rounded-lg border p-4"
                key={campaign.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {localized(campaign, "name", locale)}
                  </p>
                  <span className="text-muted-foreground text-sm">
                    /{campaign.slug} · {t(`state.${stateOf(campaign)}`)}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {t("dates", {
                    ends: format.dateTime(campaign.ends_at),
                    starts: format.dateTime(campaign.starts_at),
                  })}
                </p>
                <p className="text-sm">
                  {campaign.entries.length === 0
                    ? t("noShops")
                    : campaign.entries
                        .map((entry) =>
                          t("entry", {
                            rate: format.number(entry.discount_rate),
                            shop: entry.seller?.name ?? "",
                          })
                        )
                        .join(" · ")}
                </p>
                {canWrite ? (
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      action={setCampaignPublished}
                      fields={{
                        id: campaign.id,
                        published: String(!campaign.published),
                      }}
                    >
                      {campaign.published ? t("unpublish") : t("publish")}
                    </ActionButton>
                    {campaign.published ? null : (
                      <ActionButton
                        action={deleteCampaign}
                        confirm={{ title: t("deleteConfirm") }}
                        fields={{ id: campaign.id }}
                        variant="ghost"
                      >
                        {t("delete")}
                      </ActionButton>
                    )}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PageBody>
    </>
  );
};

export default CampaignsPage;
