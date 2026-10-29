import { formatPrice } from "@repo/commerce";
import { fileNameOf, getOrganizationFileUrl } from "@repo/storage";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { CompaniesTabs } from "../_components/companies-tabs";
import { DecideSellerForm, IndividualLimitForm, ShopKindForm } from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.companies.shops");
  return { title: t("title") };
};

const STATUS_ORDER = ["pending", "approved", "suspended", "rejected"] as const;

/** Registered business or individual trader. */
const KindBadge = ({
  kind,
  labels,
}: {
  readonly kind: "individual" | "registered" | null;
  readonly labels: Record<"individual" | "registered", string>;
}) => {
  if (!kind) {
    return null;
  }
  return <StatusBadge status="draft">{labels[kind]}</StatusBadge>;
};

/**
 * Shops that applied to sell on The IDEA (Partners → Selling): their
 * documents and payout details, newest applications first within each
 * status, and the decision with its note and deposit.
 */
const ShopsPage = async () => {
  const { canWrite, supabase } = await requireSection("companies");
  const locale = await getLocale();
  const t = await getTranslations("admin.companies.shops");
  const tCompanies = await getTranslations("admin.companies");
  const format = formatters(locale);
  const kindLabels = {
    individual: t("kinds.individual"),
    registered: t("kinds.registered"),
  };

  const [{ data }, { data: settings }] = await Promise.all([
    supabase
      .from("sellers")
      .select(
        "id, name, status, kind, applied_at, decided_at, organization:organizations (name), details:seller_details (documents, payout_bank, payout_account_name, payout_iban, deposit_required, deposit_held, review_note)"
      )
      .eq("is_house", false)
      .order("applied_at", { ascending: false }),
    supabase
      .from("store_settings")
      .select("individual_monthly_limit")
      .maybeSingle(),
  ]);
  const shops = [...(data ?? [])].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );
  const links = new Map(
    await Promise.all(
      shops
        .flatMap((shop) => shop.details?.documents ?? [])
        .map(
          async (path) =>
            [
              path,
              await getOrganizationFileUrl(supabase, path).catch(() => null),
            ] as const
        )
    )
  );

  return (
    <>
      <PageHeader title={tCompanies("title")} />
      <CompaniesTabs />
      <PageBody>
        {canWrite && settings ? (
          <Panel description={t("limitDescription")} title={t("limitTitle")}>
            <IndividualLimitForm limit={settings.individual_monthly_limit} />
          </Panel>
        ) : null}
        {shops.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="grid gap-4">
            {shops.map((shop) => {
              const { details } = shop;
              return (
                <Panel key={shop.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="grid gap-0.5">
                      <h2 className="font-semibold">{shop.name}</h2>
                      <p className="text-muted-foreground text-xs">
                        {t("applied", {
                          date: format.date(shop.applied_at),
                          organization: shop.organization?.name ?? "",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <KindBadge kind={shop.kind} labels={kindLabels} />
                      <StatusBadge status={shop.status}>
                        {t(`statuses.${shop.status}`)}
                      </StatusBadge>
                    </div>
                  </div>
                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                    <div className="grid gap-1">
                      <h3 className="font-medium">{t("documents")}</h3>
                      {(details?.documents ?? []).length === 0 ? (
                        <p className="text-muted-foreground">
                          {t("noDocuments")}
                        </p>
                      ) : (
                        <ul className="grid gap-1">
                          {(details?.documents ?? []).map((path) => {
                            const href = links.get(path);
                            return (
                              <li key={path}>
                                {href ? (
                                  <a
                                    className="underline"
                                    dir="auto"
                                    href={href}
                                    rel="noopener"
                                    target="_blank"
                                  >
                                    {fileNameOf(path)}
                                  </a>
                                ) : (
                                  <span dir="auto">{fileNameOf(path)}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div className="grid gap-1">
                      <h3 className="font-medium">{t("payout")}</h3>
                      {details?.payout_iban ? (
                        <p>
                          {details.payout_bank} · {details.payout_account_name}
                          <span className="block tabular-nums" dir="ltr">
                            {details.payout_iban}
                          </span>
                        </p>
                      ) : (
                        <p className="text-muted-foreground">{t("noPayout")}</p>
                      )}
                      {details && details.deposit_required > 0 ? (
                        <p className="text-muted-foreground">
                          {t("depositState", {
                            held: formatPrice(details.deposit_held, locale),
                            required: formatPrice(
                              details.deposit_required,
                              locale
                            ),
                          })}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {canWrite ? (
                    <>
                      <ShopKindForm id={shop.id} kind={shop.kind} />
                      <DecideSellerForm
                        deposit={details?.deposit_required ?? 0}
                        id={shop.id}
                        note={details?.review_note ?? ""}
                      />
                    </>
                  ) : null}
                </Panel>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
};

export default ShopsPage;
