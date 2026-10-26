import { localized } from "@repo/commerce";
import type { Tables } from "@repo/database";
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
} from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { SectionTabs } from "@/components/admin/section-tabs";
import { StatusBadge } from "@/components/admin/status-badge";
import { toBaghdadInput, todayInBaghdad } from "@/lib/admin/dates";
import { formatters } from "@/lib/admin/format";
import { oneOf, pageRange, type SearchParams } from "@/lib/admin/list";
import { profileNames } from "@/lib/admin/profiles";
import { canRead } from "@/lib/admin/roles";
import { requireSection } from "@/lib/admin/session";
import { RentalActions } from "./rental-actions";
import { RENTAL_VIEWS, type RentalView, rentalTabs } from "./tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.rentals");
  return { title: t("title") };
};

const views = RENTAL_VIEWS;

type View = RentalView;

const LOAN_DAYS = 14;

/** Days late after which an unreturned single-item rent is kept. */
const KEEP_AFTER_LATE_DAYS = 14;
const DAY_MS = 86_400_000;

/**
 * A single-item rent can be settled once it's back, or once it's 14 days
 * late (then it's kept at its used price).
 */
const canSettle = (rental: {
  due_at: string | null;
  kind: string;
  settled_at: string | null;
  status: string;
}) => {
  if (rental.kind !== "single" || rental.settled_at) {
    return false;
  }
  if (rental.status === "returned") {
    return true;
  }
  return (
    rental.due_at !== null &&
    (rental.status === "active" || rental.status === "overdue") &&
    Date.now() - new Date(rental.due_at).getTime() >=
      KEEP_AFTER_LATE_DAYS * DAY_MS
  );
};

const addDays = (day: string, days: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

type Rental = Tables<"rentals">;

/** A single-item rent's deposit and order, and what was settled. */
const RentalTerms = ({
  format,
  rental,
  t,
}: {
  readonly format: ReturnType<typeof formatters>;
  readonly rental: Rental;
  readonly t: Awaited<ReturnType<typeof getTranslations<"admin.rentals">>>;
}) => {
  if (rental.kind !== "single") {
    return null;
  }
  return (
    <>
      <span className="block text-muted-foreground text-xs">
        {t("single", { deposit: format.money(rental.deposit) })}
        {rental.order_id ? (
          <>
            {" · "}
            <MaybeLink
              className="hover:underline"
              href={`/orders/${rental.order_id}`}
            >
              {t("order")}
            </MaybeLink>
          </>
        ) : null}
      </span>
      {rental.settled_at ? (
        <span className="block text-muted-foreground text-xs">
          {t("settled", {
            due: format.money(rental.amount_due ?? 0),
            late: format.money(rental.late_charge ?? 0),
            refund: format.money(rental.refund_due ?? 0),
          })}
        </span>
      ) : null}
    </>
  );
};

/** The IDEA Plus rentals: requests to deliver, items out, returns. */
const RentalsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, staff, supabase } = await requireSection("rentals");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.rentals");
  const tStore = await getTranslations("store");
  const format = formatters(locale);
  const view: View =
    oneOf(params, "view", Object.keys(views) as View[]) ?? "requests";
  const { from, page, to } = pageRange(params);

  const { count, data: rentals } = await supabase
    .from("rentals")
    .select("*", { count: "exact" })
    .in("status", [...views[view]])
    .order(view === "requests" ? "requested_at" : "due_at", {
      ascending: view !== "history",
      nullsFirst: false,
    })
    .range(from, to);

  const names = await profileNames(
    supabase,
    (rentals ?? []).map((rental) => rental.user_id)
  );
  const linkCustomers = canRead(staff.role, "customers");
  const memberName = (userId: string | null) =>
    userId ? (names.get(userId) ?? t("unnamed")) : t("deleted");
  const showActions = canWrite;
  const defaultDue = addDays(todayInBaghdad(), LOAN_DAYS);

  return (
    <>
      <PageHeader title={t("title")} />
      <SectionTabs tabs={rentalTabs(t, view)} />
      <PageBody>
        {(rentals ?? []).length === 0 ? (
          <EmptyState title={t(`empty.${view}`)} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("item")}</TableHead>
                  <TableHead>{t("member")}</TableHead>
                  <TableHead>{t("requested")}</TableHead>
                  <TableHead>{t("due")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  {showActions ? (
                    <TableHead className="text-end">{t("actions")}</TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rentals ?? []).map((rental) => {
                  const name = memberName(rental.user_id);
                  return (
                    <TableRow key={rental.id}>
                      <TableCell>
                        <MaybeLink
                          className="font-medium hover:underline"
                          href={
                            rental.product_id &&
                            `/catalog/products/${rental.product_id}`
                          }
                        >
                          {localized(rental, "name", locale)}
                        </MaybeLink>
                        <RentalTerms format={format} rental={rental} t={t} />
                        {rental.staff_note ? (
                          <span className="block text-muted-foreground text-xs">
                            {rental.staff_note}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <MaybeLink
                          href={
                            linkCustomers &&
                            rental.user_id &&
                            `/customers/${rental.user_id}`
                          }
                        >
                          {name}
                        </MaybeLink>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.date(rental.requested_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {rental.status === "returned"
                          ? t("returnedOn", {
                              date: format.date(rental.returned_at),
                            })
                          : null}
                        {rental.status !== "returned" && rental.kind === "plus"
                          ? t("noDue")
                          : null}
                        {rental.status !== "returned" && rental.kind !== "plus"
                          ? format.date(rental.due_at)
                          : null}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={rental.status}>
                          {tStore(`rentalStatus.${rental.status}`)}
                        </StatusBadge>
                      </TableCell>
                      {showActions ? (
                        <TableCell className="text-end">
                          <RentalActions
                            defaultDue={defaultDue}
                            due={toBaghdadInput(rental.due_at).slice(0, 10)}
                            id={rental.id}
                            settle={canSettle(rental)}
                            single={rental.kind === "single"}
                            status={rental.status}
                            swap={rental.swap_id !== null}
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/rentals"
        />
      </PageBody>
    </>
  );
};

export default RentalsPage;
