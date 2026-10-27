import { localized } from "@repo/commerce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import {
  EmptyState,
  MaybeLink,
  PageBody,
  PageHeader,
} from "@/components/admin/page";
import { SectionTabs } from "@/components/admin/section-tabs";
import { formatters } from "@/lib/admin/format";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { cancelSwap, completeSwap } from "../actions";
import { rentalTabs } from "../tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.rentals.swaps");
  return { title: t("title") };
};

const SWAP_COLUMNS =
  "id, user_id, method, scheduled_for, fee, order_id, created_at, area:plus_areas (name_ar, name_en), order:orders (status), brings:rentals!rentals_swap_fk (id, name_ar, name_en), returns:rentals!rentals_return_swap_fk (id, name_ar, name_en)" as const;

const PAID = new Set([
  "paid",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
]);

type Supabase = Awaited<ReturnType<typeof requireSection>>["supabase"];

/** Booked swaps, soonest day first, then the counter ones. */
const loadSwaps = (supabase: Supabase) =>
  supabase
    .from("plus_swaps")
    .select(SWAP_COLUMNS)
    .eq("status", "booked")
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .order("created_at");

type Swap = NonNullable<Awaited<ReturnType<typeof loadSwaps>>["data"]>[number];
type Translate = Awaited<ReturnType<typeof getTranslations<"admin.rentals">>>;

const names = (
  rentals: readonly { name_ar: string; name_en: string }[],
  locale: string
) => rentals.map((rental) => localized(rental, "name", locale)).join(" · ");

/** When the swap happens: the area's day, no day yet, or the counter. */
const swapWhen = (
  swap: Swap,
  t: Translate,
  format: ReturnType<typeof formatters>
) => {
  if (swap.method !== "home") {
    return t("swaps.counter");
  }
  return swap.scheduled_for
    ? format.date(swap.scheduled_for)
    : t("swaps.noDay");
};

/** Complete (once any extra fee is paid) or cancel a swap. */
const SwapActions = ({
  swap,
  t,
  unpaid,
}: {
  readonly swap: Swap;
  readonly t: Translate;
  readonly unpaid: boolean;
}) => (
  <div className="flex flex-wrap justify-end gap-2">
    {unpaid ? null : (
      <ActionButton
        action={completeSwap}
        fields={{ id: swap.id }}
        variant="default"
      >
        {t("swaps.done")}
      </ActionButton>
    )}
    <ActionButton
      action={cancelSwap}
      confirm={{
        description: t("swaps.cancelDescription"),
        title: t("swaps.cancelConfirm"),
      }}
      fields={{ id: swap.id }}
      variant="ghost"
    >
      {t("swaps.cancel")}
    </ActionButton>
  </div>
);

/** One booked swap: when and where, who, what goes back and comes next. */
const SwapRow = ({
  canWrite,
  format,
  home,
  locale,
  name,
  swap,
  t,
}: {
  readonly canWrite: boolean;
  readonly format: ReturnType<typeof formatters>;
  readonly home: { address: string; phone: string } | undefined;
  readonly locale: string;
  readonly name: string;
  readonly swap: Swap;
  readonly t: Translate;
}) => {
  const unpaid = swap.order_id !== null && !PAID.has(swap.order?.status ?? "");
  const fee = format.money(swap.fee);

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        <span className="block font-medium">{swapWhen(swap, t, format)}</span>
        {swap.area ? (
          <span className="block text-muted-foreground text-xs">
            {localized(swap.area, "name", locale)}
          </span>
        ) : null}
      </TableCell>
      <TableCell>
        <MaybeLink href={swap.user_id && `/customers/${swap.user_id}`}>
          {name}
        </MaybeLink>
        {swap.method === "home" && home ? (
          <span className="block text-muted-foreground text-xs">
            {home.address} · <span dir="ltr">{home.phone}</span>
          </span>
        ) : null}
        {swap.fee > 0 ? (
          <span className="block text-xs">
            {unpaid
              ? t("swaps.feeUnpaid", { fee })
              : t("swaps.feePaid", { fee })}
          </span>
        ) : null}
      </TableCell>
      <TableCell>{names(swap.returns, locale) || "—"}</TableCell>
      <TableCell>{names(swap.brings, locale) || "—"}</TableCell>
      {canWrite ? (
        <TableCell className="text-end">
          <SwapActions swap={swap} t={t} unpaid={unpaid} />
        </TableCell>
      ) : null}
    </TableRow>
  );
};

/**
 * The IDEA Plus swaps booked: at home on the area's day (soonest first) or
 * at the counter, with what goes back and what comes next.
 */
const SwapsPage = async () => {
  const { canWrite, supabase } = await requireSection("rentals");
  const locale = await getLocale();
  const t = await getTranslations("admin.rentals");
  const format = formatters(locale);

  const { data: swaps } = await loadSwaps(supabase);
  const members = (swaps ?? []).flatMap((swap) =>
    swap.user_id ? [swap.user_id] : []
  );
  const [memberNames, { data: homes }] = await Promise.all([
    profileNames(supabase, members),
    supabase
      .from("plus_homes")
      .select("user_id, address, phone")
      .in("user_id", members),
  ]);
  const homeOf = new Map((homes ?? []).map((home) => [home.user_id, home]));

  return (
    <>
      <PageHeader title={t("title")} />
      <SectionTabs tabs={rentalTabs(t, null)} />
      <PageBody>
        {(swaps ?? []).length === 0 ? (
          <EmptyState title={t("swaps.empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("swaps.when")}</TableHead>
                  <TableHead>{t("member")}</TableHead>
                  <TableHead>{t("swaps.back")}</TableHead>
                  <TableHead>{t("swaps.next")}</TableHead>
                  {canWrite ? (
                    <TableHead className="text-end">{t("actions")}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(swaps ?? []).map((swap) => (
                  <SwapRow
                    canWrite={canWrite}
                    format={format}
                    home={swap.user_id ? homeOf.get(swap.user_id) : undefined}
                    key={swap.id}
                    locale={locale}
                    name={
                      swap.user_id
                        ? (memberNames.get(swap.user_id) ?? t("unnamed"))
                        : t("deleted")
                    }
                    swap={swap}
                    t={t}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  );
};

export default SwapsPage;
