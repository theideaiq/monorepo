import { formatPrice } from "@repo/commerce";
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
import { canRead } from "@/lib/admin/roles";
import { requireSection } from "@/lib/admin/session";
import { FinanceTabs } from "../_components/finance-tabs";
import { DecideForm, PayoutForm, RateForm, RestoreForm } from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.nav");
  return { title: t("affiliates") };
};

/** The least finance pays an affiliate at once, in IQD. */
const MINIMUM_PAYOUT = 25_000;

const PAYS = new Set(["admin", "finance", "superadmin"]);

/**
 * Staff → Finance → Affiliates: organizations that share The IDEA for a
 * commission. Marketing and finance decide on applications; finance sets
 * the rates and pays what's payable once it reaches 25,000 IQD.
 */
const AffiliatesPage = async () => {
  const { canWrite, staff, supabase } = await requireSection("affiliates");
  const locale = await getLocale();
  const t = await getTranslations("admin.affiliates");
  const tFamilies = await getTranslations("app.affiliate.families");
  const tMethods = await getTranslations("app.affiliate.methods");
  const format = formatters(locale);
  const pays = PAYS.has(staff.role);

  const [{ data: affiliates }, { data: rates }, balances] = await Promise.all([
    supabase
      .from("affiliates")
      .select(
        "organization_id, status, pitch, channel, code, payout_method, payout_account, staff_note, created_at, organization:organizations (name)"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("affiliate_rates").select("family, rate").order("family"),
    pays ? supabase.rpc("affiliate_balances") : Promise.resolve({ data: [] }),
  ]);
  const rows = affiliates ?? [];
  const applied = rows.filter((row) => row.status === "applied");
  const others = rows.filter((row) => row.status !== "applied");
  const due = (balances.data ?? []).filter(
    (row) => row.payable >= MINIMUM_PAYOUT
  );
  const family = (slug: string) =>
    tFamilies.has(slug as "music") ? tFamilies(slug as "music") : slug;
  const method = (value: string | null) =>
    value ? tMethods(value as "bank") : t("noPayout");

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      {canRead(staff.role, "finance") ? <FinanceTabs /> : null}
      <PageBody className="max-w-5xl">
        <Panel title={t("applications")}>
          {applied.length === 0 ? (
            <EmptyState title={t("noApplications")} />
          ) : (
            <ul className="grid gap-4">
              {applied.map((row) => (
                <li
                  className="grid gap-2 rounded-md border p-3 text-sm"
                  key={row.organization_id}
                >
                  <p className="font-medium">
                    {row.organization?.name} ·{" "}
                    <span className="text-muted-foreground">
                      {format.date(row.created_at)}
                    </span>
                  </p>
                  <p dir="auto">{row.pitch}</p>
                  {row.channel ? (
                    <p className="text-muted-foreground" dir="auto">
                      {row.channel}
                    </p>
                  ) : null}
                  {canWrite ? (
                    <DecideForm
                      code={row.code}
                      org={row.organization_id}
                      status={row.status}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {pays ? (
          <Panel
            description={t("payoutsDescription", {
              minimum: formatPrice(MINIMUM_PAYOUT, locale),
            })}
            title={t("payouts")}
          >
            {due.length === 0 ? (
              <EmptyState title={t("noPayouts")} />
            ) : (
              <ul className="grid gap-3">
                {due.map((row) => (
                  <li
                    className="grid gap-2 rounded-md border p-3 text-sm"
                    key={row.organization_id}
                  >
                    <p className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium">
                        {row.name} · <span dir="ltr">{row.code}</span>
                      </span>
                      <span>{formatPrice(row.payable, locale)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      {method(row.payout_method)}
                      {row.payout_account ? (
                        <span dir="ltr"> · {row.payout_account}</span>
                      ) : null}
                    </p>
                    {row.payout_method ? (
                      <PayoutForm org={row.organization_id} />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : null}

        <Panel title={t("all")}>
          {others.length === 0 ? (
            <EmptyState title={t("none")} />
          ) : (
            <ul className="grid gap-3">
              {others.map((row) => (
                <li
                  className="grid gap-2 rounded-md border p-3 text-sm"
                  key={row.organization_id}
                >
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {row.organization?.name}
                    </span>
                    {row.code ? <span dir="ltr">{row.code}</span> : null}
                    <StatusBadge status={row.status}>
                      {t(`statuses.${row.status}`)}
                    </StatusBadge>
                  </p>
                  {row.staff_note ? (
                    <p className="text-muted-foreground" dir="auto">
                      {row.staff_note}
                    </p>
                  ) : null}
                  {canWrite && row.status === "approved" ? (
                    <DecideForm
                      code={row.code}
                      org={row.organization_id}
                      status={row.status}
                    />
                  ) : null}
                  {canWrite && row.status === "suspended" ? (
                    <RestoreForm org={row.organization_id} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel description={t("ratesDescription")} title={t("rates")}>
          <div className="flex flex-wrap gap-4">
            {(rates ?? []).map((rate) =>
              pays ? (
                <RateForm
                  family={rate.family}
                  key={rate.family}
                  label={family(rate.family)}
                  rate={Number(rate.rate)}
                />
              ) : (
                <p className="text-sm" key={rate.family}>
                  {family(rate.family)}: {format.number(Number(rate.rate))}%
                </p>
              )
            )}
          </div>
        </Panel>
      </PageBody>
    </>
  );
};

export default AffiliatesPage;
