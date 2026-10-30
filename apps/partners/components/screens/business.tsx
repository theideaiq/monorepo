"use client";

import {
  type OrganizationFeature,
  organizationFeatures,
} from "@repo/auth/organizations";
import { formatPrice, planName } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  AlertTriangleIcon,
  BriefcaseIcon,
  CheckCircle2Icon,
  ClockIcon,
  CodeXmlIcon,
  EyeOffIcon,
  FileTextIcon,
  GavelIcon,
  HandshakeIcon,
  type LucideIcon,
  MessageSquareQuoteIcon,
  PackageIcon,
  PackageOpenIcon,
  PlusIcon,
  ReceiptIcon,
  StoreIcon,
  TicketPercentIcon,
  TruckIcon,
  Undo2Icon,
  UsersIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { BusinessShell } from "@/components/business/business-shell";
import { ListActions } from "@/components/list-actions";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useShopPayouts } from "@/lib/payout-queries";
import { useCompanyOverview } from "@/lib/procurement-queries";
import {
  usePlans,
  useSetOrganizationFeature,
  useSubscription,
} from "@/lib/queries";
import { useSeller } from "@/lib/seller-queries";
import { useShopLines } from "@/lib/shop-order-queries";
import {
  keyNumbers,
  type ShopRows,
  type Task,
  type TaskKind,
  todayTasks,
} from "@/lib/today";
import { useShopRatings, useShopTasks } from "@/lib/today-queries";

const taskIcons: Record<TaskKind, LucideIcon> = {
  invoices: ReceiptIcon,
  needsPhoto: EyeOffIcon,
  offer: MessageSquareQuoteIcon,
  pack: PackageIcon,
  parcelBack: TruckIcon,
  quotes: FileTextIcon,
  returnAnswer: Undo2Icon,
  returnCheck: Undo2Icon,
  unpaidAuction: GavelIcon,
};

const Stat = ({
  detail,
  label,
  value,
}: {
  readonly detail?: string;
  readonly label: string;
  readonly value: string;
}) => (
  <div className="grid gap-1 rounded-lg border bg-card p-4">
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className="font-mono font-semibold text-xl tabular-nums">
      {value}
    </span>
    {detail ? (
      <span className="text-muted-foreground text-xs">{detail}</span>
    ) : null}
  </div>
);

/** Sales this week, the next payout, live listings and the rating. */
const KeyNumbers = ({
  rows,
  sellerId,
}: {
  readonly rows: ShopRows;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.business.today.numbers");
  const locale = useLocale() as Locale;
  const lines = useShopLines(sellerId);
  const payouts = useShopPayouts(sellerId);
  const ratings = useShopRatings(
    rows.listings.map((listing) => listing.product_id)
  );
  const numbers = keyNumbers({
    lines: lines.data ?? [],
    listings: rows.listings,
    payouts: payouts.data ?? [],
    ratings: ratings.data ?? [],
  });

  return (
    <section aria-labelledby="key-numbers" className="grid gap-3">
      <h2 className="sr-only" id="key-numbers">
        {t("title")}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("salesWeek")}
          value={formatPrice(numbers.salesWeek, locale)}
        />
        <Stat
          detail={
            numbers.nextPayout
              ? t("nextPayoutDate", {
                  date: formatDate(
                    `${numbers.nextPayout.periodEnd}T12:00:00`,
                    locale
                  ),
                })
              : undefined
          }
          label={t("nextPayout")}
          value={
            numbers.nextPayout
              ? formatPrice(numbers.nextPayout.amount, locale)
              : t("noPayout")
          }
        />
        <Stat
          label={t("liveListings")}
          value={formatNumber(numbers.liveListings, locale)}
        />
        <Stat
          detail={
            numbers.rating
              ? t("ratingCount", {
                  count: formatNumber(numbers.rating.count, locale),
                })
              : undefined
          }
          label={t("rating")}
          value={
            numbers.rating
              ? t("ratingValue", {
                  average: formatNumber(numbers.rating.average, locale, {
                    maximumFractionDigits: 1,
                    minimumFractionDigits: 1,
                  }),
                })
              : t("noRating")
          }
        />
      </div>
    </section>
  );
};

/** When a task is due, in words with an icon. */
const Due = ({ due }: { readonly due: string | null }) => {
  const t = useTranslations("app.business.today.tasks");
  const locale = useLocale() as Locale;
  if (!due) {
    return null;
  }
  const time = formatDateTime(due, locale);
  if (new Date(due).getTime() < Date.now()) {
    return (
      <Badge variant="warning">
        <AlertTriangleIcon aria-hidden="true" />
        {t("overdue", { time })}
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <ClockIcon aria-hidden="true" className="size-3.5" />
      {t("dueBy", { time })}
    </span>
  );
};

const TaskRow = ({ task }: { readonly task: Task }) => {
  const t = useTranslations("app.business.today.tasks");
  const locale = useLocale() as Locale;
  const Icon = taskIcons[task.kind];
  const name = locale === "ar" ? task.name.ar : task.name.en;
  const count = formatNumber(task.count ?? 0, locale);
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <Icon aria-hidden="true" className="size-5 shrink-0 text-pink-text" />
      <div className="grid min-w-0 flex-1 gap-1">
        <span className="font-medium text-sm">
          {t(`kinds.${task.kind}`, { count })}
          {name ? (
            <span className="font-normal text-muted-foreground">
              {" · "}
              <span dir="auto">{name}</span>
            </span>
          ) : null}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          {task.reference ? (
            <span className="font-mono text-muted-foreground text-xs">
              {task.kind === "unpaidAuction"
                ? t("auction", { number: task.reference })
                : t("order", { number: task.reference })}
            </span>
          ) : null}
          <Due due={task.due} />
        </span>
      </div>
      <Button asChild className="ms-auto" size="sm" variant="outline">
        <Link href={task.href}>{t(`actions.${task.kind}`)}</Link>
      </Button>
    </li>
  );
};

/** Every task waiting for the organization, by deadline. */
const Tasks = ({ tasks }: { readonly tasks: readonly Task[] }) => {
  const t = useTranslations("app.business.today.tasks");
  return (
    <section aria-labelledby="tasks" className="grid gap-3">
      <h2 className="font-semibold text-lg" id="tasks">
        {t("title")}
      </h2>
      {tasks.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border p-4 text-muted-foreground text-sm">
          <CheckCircle2Icon
            aria-hidden="true"
            className="size-4 text-success"
          />
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  );
};

/** The plan line under Today. */
const PlanLine = () => {
  const t = useTranslations("app.business.overview");
  const locale = useLocale();
  const { active } = useActiveOrganization();
  const plans = usePlans("business");
  const subscription = useSubscription(active.id);
  const plan = plans.data?.find((row) => row.id === subscription.data?.plan_id);
  return (
    <Link
      className="text-muted-foreground text-sm underline"
      href="/settings/billing"
    >
      {plan ? t("plan", { plan: planName(plan, locale) }) : t("noPlan")}
    </Link>
  );
};

/** Today: key numbers, then everything that needs the organization. */
const TodayBody = () => {
  const { active } = useActiveOrganization();
  const selling = active.features.includes("selling");
  const shop = useSeller(active.id, selling);
  const approved = shop.data?.seller.status === "approved";
  const sellerId = approved ? (shop.data?.seller.id ?? "") : "";
  const shopTasks = useShopTasks(sellerId);
  const overview = useCompanyOverview(active.id);
  const team = active.features.includes("team");

  if (
    (selling && shop.isPending) ||
    shopTasks.isPending ||
    overview.isPending
  ) {
    return <SectionSpinner />;
  }
  if (shop.isError || shopTasks.isError || overview.isError) {
    return (
      <ErrorState
        onRetry={() => {
          shop.refetch();
          shopTasks.refetch();
          overview.refetch();
        }}
      />
    );
  }
  const tasks = todayTasks(shopTasks.rows, {
    quotesToAnswer: team ? overview.data.quotesToAnswer : 0,
    unpaidInvoices: overview.data.unpaidInvoices,
  });

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      {shopTasks.rows ? (
        <KeyNumbers rows={shopTasks.rows} sellerId={sellerId} />
      ) : null}
      <Tasks tasks={tasks} />
      <PlanLine />
      <AddSections />
    </div>
  );
};

const sectionIcons: Record<OrganizationFeature, LucideIcon> = {
  affiliate: HandshakeIcon,
  developers: CodeXmlIcon,
  opportunities: BriefcaseIcon,
  perks: TicketPercentIcon,
  selling: StoreIcon,
  supply: PackageOpenIcon,
  team: UsersIcon,
};

/**
 * Sections the organization hasn't added yet: "Add" for owners and admins,
 * what each does for everyone (the menu's "Add" links here).
 */
const AddSections = () => {
  const t = useTranslations("app");
  const { active, canManage } = useActiveOrganization();
  const setFeature = useSetOrganizationFeature(active);
  const missing = organizationFeatures.filter(
    (feature) => !active.features.includes(feature)
  );

  if (missing.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="add-sections-title"
      className="grid scroll-mt-4 gap-3"
      id="add-sections"
    >
      <div className="grid gap-1">
        <h2 className="font-semibold text-lg" id="add-sections-title">
          {t("business.sections.title")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {canManage
            ? t("business.sections.description")
            : t("business.sections.offAsk")}
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
              {canManage ? (
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
              ) : null}
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

/** Today (`/`): the active organization's day, or the introduction. */
export const Business = () => (
  <BusinessShell actions={<ListActions />}>
    <TodayBody />
  </BusinessShell>
);
