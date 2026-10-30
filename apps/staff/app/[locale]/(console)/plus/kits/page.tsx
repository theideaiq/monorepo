import { HOUSE_SELLER_ID, localized } from "@repo/commerce";
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
import {
  EmptyState,
  MaybeLink,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { SectionTabs } from "@/components/admin/section-tabs";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { supplierOptions } from "@/lib/admin/suppliers";
import { plusTabs } from "../tabs";
import {
  AddKitUnitForm,
  KitBookingActions,
  KitTypeForm,
  KitUnitStatus,
} from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.rentals.kits");
  return { title: t("title") };
};

const PAID = new Set([
  "paid",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
]);

const BOOKING_COLUMNS =
  "id, user_id, kit_type, starts_on, ends_on, status, deposit, deposit_waived, refund_due, order_id, unit:kit_units (label), order:orders (status, shipping_address), games:kit_booking_games (product:products (name_ar, name_en), rental_id)" as const;

type Supabase = Awaited<ReturnType<typeof requireSection>>["supabase"];

const loadBookings = (supabase: Supabase) =>
  supabase
    .from("kit_bookings")
    .select(BOOKING_COLUMNS)
    .in("status", ["booked", "out"])
    .order("starts_on")
    .limit(100);

type Booking = NonNullable<
  Awaited<ReturnType<typeof loadBookings>>["data"]
>[number];
type Translate = Awaited<ReturnType<typeof getTranslations<"admin.rentals">>>;

/** One booking: the weekend, kit and unit, member, games and deposit. */
const BookingRow = ({
  booking,
  canWrite,
  format,
  kitName,
  locale,
  name,
  t,
}: {
  readonly booking: Booking;
  readonly canWrite: boolean;
  readonly format: ReturnType<typeof formatters>;
  readonly kitName: string;
  readonly locale: string;
  readonly name: string;
  readonly t: Translate;
}) => {
  const paid = PAID.has(booking.order?.status ?? "");
  const address = (booking.order?.shipping_address ?? {}) as {
    address?: string;
    phone?: string;
  };
  let deposit = t("kits.depositUnpaid", {
    amount: format.money(booking.deposit),
  });
  if (booking.deposit_waived) {
    deposit = t("kits.depositWaived");
  } else if (paid) {
    deposit = t("kits.depositPaid", { amount: format.money(booking.deposit) });
  }
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        <span className="block font-medium">
          {format.date(booking.starts_on)} – {format.date(booking.ends_on)}
        </span>
        <span className="block text-muted-foreground text-xs">
          {kitName} · {booking.unit?.label}
        </span>
      </TableCell>
      <TableCell>
        <MaybeLink href={booking.user_id && `/customers/${booking.user_id}`}>
          {name}
        </MaybeLink>
        <span className="block text-muted-foreground text-xs">
          {address.address} · <span dir="ltr">{address.phone}</span>
        </span>
      </TableCell>
      <TableCell>
        {booking.games
          .map((game) =>
            game.product
              ? `${localized(game.product, "name", locale)}${game.rental_id ? "" : ` (${t("kits.notHeld")})`}`
              : ""
          )
          .join(" · ") || "—"}
      </TableCell>
      <TableCell>
        <StatusBadge status={booking.status}>
          {t(`kits.status.${booking.status as "booked" | "out"}`)}
        </StatusBadge>
        <span className="block text-xs">{deposit}</span>
      </TableCell>
      {canWrite ? (
        <TableCell className="text-end">
          <KitBookingActions
            canWaive={!(paid || booking.deposit_waived) && booking.deposit > 0}
            id={booking.id}
            paid={paid}
            status={booking.status}
          />
        </TableCell>
      ) : null}
    </TableRow>
  );
};

/**
 * Game night kits: the weekends booked (hand over, collect, waive a
 * deposit for someone whose ID was checked), the kits and their units.
 */
const KitsPage = async () => {
  const { canWrite, staff, supabase } = await requireSection("rentals");
  const locale = await getLocale();
  const t = await getTranslations("admin.rentals");
  const format = formatters(locale);

  const [{ data: bookings }, { data: kits }, { data: units }, suppliers] =
    await Promise.all([
      loadBookings(supabase),
      supabase
        .from("kit_types")
        .select("id, name_ar, name_en, price, extra_day_price, deposit, active")
        .order("position"),
      supabase
        .from("kit_units")
        .select("id, kit_type, label, status, seller_id")
        .order("kit_type")
        .order("label"),
      supplierOptions(supabase, t("kits.house")),
    ]);
  const supplierName = new Map(suppliers.map((row) => [row.id, row.name]));
  const names = await profileNames(
    supabase,
    (bookings ?? []).flatMap((booking) =>
      booking.user_id ? [booking.user_id] : []
    )
  );
  const kitName = new Map(
    (kits ?? []).map((kit) => [kit.id, localized(kit, "name", locale)])
  );

  return (
    <>
      <PageHeader title={t("title")} />
      <SectionTabs tabs={plusTabs(t, staff.role)} />
      <PageBody className="max-w-6xl">
        <Panel description={t("kits.bookingsHint")} title={t("kits.bookings")}>
          {(bookings ?? []).length === 0 ? (
            <EmptyState title={t("kits.empty")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("kits.weekend")}</TableHead>
                    <TableHead>{t("member")}</TableHead>
                    <TableHead>{t("kits.gamesColumn")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    {canWrite ? (
                      <TableHead className="text-end">{t("actions")}</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(bookings ?? []).map((booking) => (
                    <BookingRow
                      booking={booking}
                      canWrite={canWrite}
                      format={format}
                      key={booking.id}
                      kitName={
                        kitName.get(booking.kit_type) ?? booking.kit_type
                      }
                      locale={locale}
                      name={
                        booking.user_id
                          ? (names.get(booking.user_id) ?? t("unnamed"))
                          : t("deleted")
                      }
                      t={t}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>

        <Panel description={t("kits.unitsHint")} title={t("kits.unitsTitle")}>
          <div className="grid gap-3">
            {(units ?? []).length === 0 ? (
              <EmptyState title={t("kits.noUnits")} />
            ) : (
              <ul className="divide-y rounded-lg border">
                {(units ?? []).map((unit) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm"
                    key={unit.id}
                  >
                    <span>
                      {kitName.get(unit.kit_type) ?? unit.kit_type} ·{" "}
                      {unit.label}
                      {unit.seller_id === HOUSE_SELLER_ID ? null : (
                        <span className="block text-muted-foreground text-xs">
                          {t("kits.suppliedBy", {
                            shop: supplierName.get(unit.seller_id) ?? "",
                          })}
                        </span>
                      )}
                    </span>
                    {canWrite ? (
                      <KitUnitStatus
                        id={unit.id}
                        sellerId={unit.seller_id}
                        status={unit.status}
                        suppliers={suppliers}
                      />
                    ) : (
                      <span>{t(`kits.units.${unit.status as "active"}`)}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canWrite ? (
              <AddKitUnitForm
                kits={(kits ?? []).map((kit) => ({
                  id: kit.id,
                  name: kitName.get(kit.id) ?? kit.id,
                }))}
                suppliers={suppliers}
              />
            ) : null}
          </div>
        </Panel>

        <Panel description={t("kits.pricesHint")} title={t("kits.prices")}>
          <div className="grid gap-3">
            {(kits ?? []).map((kit) => (
              <KitTypeForm
                disabled={!canWrite}
                key={kit.id}
                kit={{ ...kit, name: kitName.get(kit.id) ?? kit.id }}
              />
            ))}
          </div>
        </Panel>
      </PageBody>
    </>
  );
};

export default KitsPage;
