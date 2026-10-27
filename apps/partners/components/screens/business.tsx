"use client";

import { planName } from "@repo/commerce";
import {
  formatCurrency,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  ChevronRightIcon,
  CrownIcon,
  FileTextIcon,
  type LucideIcon,
  PackageSearchIcon,
  ReceiptIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useCompanyOverview } from "@/lib/procurement-queries";
import { usePlans, useSubscription } from "@/lib/queries";

const Tile = ({
  detail,
  href,
  icon: Icon,
  label,
  value,
}: {
  readonly detail?: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly label: string;
  readonly value: string;
}) => (
  <Link
    className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-2"
    href={href}
  >
    <span className="flex items-center gap-3">
      <Icon aria-hidden="true" className="size-5 shrink-0 text-pink-text" />
      <span className="grid gap-0.5">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="font-semibold text-xl tabular-nums">{value}</span>
        {detail ? (
          <span className="text-muted-foreground text-xs">{detail}</span>
        ) : null}
      </span>
    </span>
    <ChevronRightIcon
      aria-hidden="true"
      className="size-4 text-muted-foreground rtl:rotate-180"
    />
  </Link>
);

/** What needs the company's attention: quotes, requests, invoices, Plus, plan. */
const Overview = () => {
  const t = useTranslations("app.business.overview");
  const locale = useLocale();
  const { active } = useActiveOrganization();
  const overview = useCompanyOverview(active.id);
  const plans = usePlans("business");
  const subscription = useSubscription(active.id);
  const plan = plans.data?.find((row) => row.id === subscription.data?.plan_id);

  if (overview.isPending) {
    return <SectionSpinner />;
  }
  if (overview.isError) {
    return <ErrorState onRetry={() => overview.refetch()} />;
  }
  const { data } = overview;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-1">
        <h2 className="font-semibold text-xl tracking-tight">{active.name}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Tile
          href="/procurement"
          icon={FileTextIcon}
          label={t("quotesToAnswer")}
          value={formatNumber(data.quotesToAnswer, locale)}
        />
        <Tile
          href="/procurement"
          icon={PackageSearchIcon}
          label={t("openRequests")}
          value={formatNumber(data.openRequests, locale)}
        />
        <Tile
          detail={
            data.unpaidInvoices
              ? t("unpaidTotal", {
                  total: formatCurrency(data.unpaidTotal, locale),
                })
              : undefined
          }
          href="/invoices"
          icon={ReceiptIcon}
          label={t("unpaidInvoices")}
          value={formatNumber(data.unpaidInvoices, locale)}
        />
        <Tile
          href="/plus"
          icon={CrownIcon}
          label={t("plusSeats")}
          value={formatNumber(data.plusSeats, locale)}
        />
      </div>
      <Link className="text-muted-foreground text-sm underline" href="/billing">
        {plan ? t("plan", { plan: planName(plan, locale) }) : t("noPlan")}
      </Link>
    </div>
  );
};

/** /business: the active company's overview, or the introduction. */
export const Business = () => (
  <BusinessShell>
    <Overview />
  </BusinessShell>
);
