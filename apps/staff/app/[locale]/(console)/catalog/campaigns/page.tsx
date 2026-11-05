import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { CampaignForm } from "../_components/campaign-form";
import { CatalogTabs } from "../_components/catalog-tabs";
import { deleteCampaign, setCampaignPublished } from "../actions";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many days a campaign ran, rounded up. */
const campaignDays = (campaign: { ends_at: string; starts_at: string }) =>
  Math.ceil(
    (new Date(campaign.ends_at).getTime() -
      new Date(campaign.starts_at).getTime()) /
      DAY_MS
  );

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.campaigns");
  return { title: t("title") };
};

/**
 * Catalog → Campaigns: seasonal campaigns, newest first, with the shops
 * taking part and their discounts. Shops opt in from Partners once a
 * campaign is published; it runs and ends by its dates.
 */
const CampaignsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<{ from?: string | string[] }>;
}) => {
  const { canWrite, supabase } = await requireSection("catalog");
  const { from } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog.campaigns");
  const format = formatters(locale);

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select(
      "id, slug, name_en, name_ar, description_en, description_ar, starts_at, ends_at, published, entries:campaign_entries (discount_rate, seller:sellers (name))"
    )
    .order("starts_at", { ascending: false })
    .limit(50);
  const now = new Date().toISOString();
  // A6: "Use as a template" fills the form with a past campaign's words.
  const template = (campaigns ?? []).find((campaign) => campaign.id === from);

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
            {template ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <p className="text-muted-foreground">
                  {t("fromTemplate", {
                    count: campaignDays(template),
                    days: format.number(campaignDays(template)),
                    name: localized(template, "name", locale),
                  })}
                </p>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/catalog/campaigns">{t("startBlank")}</Link>
                </Button>
              </div>
            ) : null}
            <CampaignForm
              key={template?.id ?? "blank"}
              template={
                template
                  ? {
                      descriptionAr: template.description_ar ?? "",
                      descriptionEn: template.description_en ?? "",
                      nameAr: template.name_ar,
                      nameEn: template.name_en,
                    }
                  : undefined
              }
            />
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
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/catalog/campaigns?from=${campaign.id}`}
                        scroll
                      >
                        {t("useTemplate")}
                      </Link>
                    </Button>
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
