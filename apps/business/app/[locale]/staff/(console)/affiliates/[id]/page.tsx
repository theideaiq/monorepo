import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  DetailList,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { affiliateStatusTone, suggestCode } from "@/lib/admin/affiliates";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { DecideAffiliateForm } from "../affiliate-forms";
import {
  BalancePanel,
  CommissionsPanel,
  PayoutsPanel,
} from "./affiliate-tables";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.affiliates");
  return { title: t("detail") };
};

/**
 * One affiliate: their application and decision (marketing), balance and
 * payouts (finance), and every commission.
 */
const AffiliatePage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { canWrite, staff, supabase } = await requireSection("affiliates");
  const t = await getTranslations("admin.affiliates");
  const format = formatters(await getLocale());
  const admin = staff.role === "admin" || staff.role === "superadmin";
  const marketing = canWrite && (admin || staff.role === "marketing");
  const finance = canWrite && (admin || staff.role === "finance");

  const { data: affiliate } = await supabase
    .from("affiliates")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();
  if (!affiliate) {
    notFound();
  }

  const [names, { data: balances }, { data: commissions }, { data: payouts }] =
    await Promise.all([
      profileNames(supabase, [affiliate.user_id, affiliate.decided_by]),
      supabase.rpc("affiliate_balances"),
      supabase
        .from("affiliate_commissions")
        .select("id, kind, amount, status, available_at, created_at")
        .eq("affiliate_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("affiliate_payouts")
        .select("id, amount, method, reference, bulbs, created_at")
        .eq("affiliate_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
  const name = names.get(affiliate.user_id) || t("unnamed");
  const decider = affiliate.decided_by
    ? names.get(affiliate.decided_by)
    : undefined;
  const money = balances?.find((row) => row.affiliate_id === id);

  return (
    <>
      <PageHeader
        back={{ href: "/affiliates", label: t("title") }}
        description={t("appliedOn", {
          date: format.dateTime(affiliate.created_at),
        })}
        title={name}
      >
        <StatusBadge tone={affiliateStatusTone[affiliate.status]}>
          {t(`statuses.${affiliate.status}`)}
        </StatusBadge>
      </PageHeader>
      <PageBody className="lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <Panel title={t("application")}>
            <DetailList
              items={[
                { label: t("pitch"), value: affiliate.pitch },
                {
                  label: t("channel"),
                  value: affiliate.channel ? (
                    <span dir="ltr">{affiliate.channel}</span>
                  ) : (
                    "—"
                  ),
                },
                {
                  label: t("code"),
                  value: (
                    <span className="font-mono" dir="ltr">
                      {affiliate.code ?? "—"}
                    </span>
                  ),
                },
                {
                  label: t("decidedBy"),
                  value: affiliate.decided_at
                    ? `${decider || "—"} · ${format.dateTime(affiliate.decided_at)}`
                    : "—",
                },
              ]}
            />
          </Panel>

          <CommissionsPanel rows={commissions ?? []} />
          <PayoutsPanel rows={payouts ?? []} />
        </div>

        <div className="grid content-start gap-6">
          {marketing ? (
            <Panel title={t("decide")}>
              <DecideAffiliateForm
                code={affiliate.code ?? suggestCode(name)}
                note={affiliate.staff_note}
                status={affiliate.status}
                userId={id}
              />
            </Panel>
          ) : null}
          <BalancePanel
            account={affiliate.payout_account}
            canPay={finance}
            method={affiliate.payout_method}
            money={money}
            userId={id}
          />
        </div>
      </PageBody>
    </>
  );
};

export default AffiliatePage;
