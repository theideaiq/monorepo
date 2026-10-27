"use client";

import {
  type OrganizationFeature,
  organizationFeatures,
} from "@repo/auth/organizations";
import { planName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  formatCurrency,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  ChevronRightIcon,
  CodeXmlIcon,
  CrownIcon,
  FileTextIcon,
  type LucideIcon,
  PackageSearchIcon,
  PlusIcon,
  ReceiptIcon,
  TicketPercentIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useCompanyOverview } from "@/lib/procurement-queries";
import {
  usePlans,
  useSetOrganizationFeature,
  useSubscription,
} from "@/lib/queries";

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
  const bulkBuying = active.features.includes("bulk_buying");

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
        {bulkBuying ? (
          <>
            <Tile
              href="/bulk-buying"
              icon={FileTextIcon}
              label={t("quotesToAnswer")}
              value={formatNumber(data.quotesToAnswer, locale)}
            />
            <Tile
              href="/bulk-buying"
              icon={PackageSearchIcon}
              label={t("openRequests")}
              value={formatNumber(data.openRequests, locale)}
            />
          </>
        ) : null}
        <Tile
          detail={
            data.unpaidInvoices
              ? t("unpaidTotal", {
                  total: formatCurrency(data.unpaidTotal, locale),
                })
              : undefined
          }
          href="/organization/invoices"
          icon={ReceiptIcon}
          label={t("unpaidInvoices")}
          value={formatNumber(data.unpaidInvoices, locale)}
        />
        <Tile
          href="/organization/plus"
          icon={CrownIcon}
          label={t("plusSeats")}
          value={formatNumber(data.plusSeats, locale)}
        />
      </div>
      <Link
        className="text-muted-foreground text-sm underline"
        href="/organization/billing"
      >
        {plan ? t("plan", { plan: planName(plan, locale) }) : t("noPlan")}
      </Link>
      <AddSections />
    </div>
  );
};

const sectionIcons: Record<OrganizationFeature, LucideIcon> = {
  bulk_buying: PackageSearchIcon,
  developers: CodeXmlIcon,
  perks: TicketPercentIcon,
};

/** Sections the organization hasn't added yet ("Add", owners and admins). */
const AddSections = () => {
  const t = useTranslations("app");
  const { active, canManage } = useActiveOrganization();
  const setFeature = useSetOrganizationFeature(active);
  const missing = organizationFeatures.filter(
    (feature) => !active.features.includes(feature)
  );

  if (!canManage || missing.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="add-sections" className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="font-semibold" id="add-sections">
          {t("business.sections.title")}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t("business.sections.description")}
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {missing.map((feature) => {
          const Icon = sectionIcons[feature];
          return (
            <li
              className="flex items-start justify-between gap-4 rounded-lg border p-4"
              key={feature}
            >
              <span className="flex items-start gap-3">
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-pink-text"
                />
                <span className="grid gap-1">
                  <span className="font-medium">{t(`nav.${feature}`)}</span>
                  <span className="text-muted-foreground text-sm">
                    {t(`business.sections.${feature}.description`)}
                  </span>
                </span>
              </span>
              <Button
                aria-label={t("business.sections.addSection", {
                  section: t(`nav.${feature}`),
                })}
                disabled={setFeature.isPending}
                onClick={() => setFeature.mutate({ feature, on: true })}
                size="sm"
                variant="outline"
              >
                <PlusIcon />
                {t("business.sections.add")}
              </Button>
            </li>
          );
        })}
      </ul>
      {setFeature.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("business.sections.failed")}
        </p>
      ) : null}
    </section>
  );
};

/** Home: the active organization's overview, or the introduction. */
export const Business = () => (
  <BusinessShell>
    <Overview />
  </BusinessShell>
);
