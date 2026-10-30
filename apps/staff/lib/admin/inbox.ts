import "server-only";

import { HOUSE_SELLER_ID } from "@repo/commerce";
import type { StaffRole } from "@repo/database";
import { cache } from "react";
import { awaitingFulfilment } from "./fulfilment";
import { type InboxKind, kindSection } from "./inbox-kinds";
import { canRead, type MenuId } from "./roles";
import type { ServerClient } from "./session";

/**
 * What's waiting on staff, for the sections the role can open. The
 * decisions (tickets, verifications, checks, returns, shops, applications,
 * submissions) are the Inbox's list (see `inbox-rows.tsx`); this counts
 * them for the menu, and counts the other work that has its own page
 * ("Other work" under the list).
 */

export const inboxItems = [
  "orders",
  "lateShopLines",
  "shopRefunds",
  "rentalRequests",
  "overdueRentals",
  "opportunities",
  "surveys",
  "surveyAppeals",
  "passApps",
  "houseOffers",
  "pendingPayouts",
  "programRefunds",
  "telegram",
  "procurement",
  "seats",
  "invoices",
] as const;

export type InboxItem = (typeof inboxItems)[number];

export interface InboxEntry {
  count: number;
  href: string;
  id: InboxItem;
}

const head = { count: "exact", head: true } as const;

const hrefs: Record<InboxItem, string> = {
  houseOffers: "/catalog/offers",
  invoices: "/partners/invoices",
  lateShopLines: "/orders/shop-lines",
  opportunities: "/club/opportunities#review",
  orders: "/orders?status=awaiting",
  overdueRentals: "/plus/coming-back",
  passApps: "/partners/sign-in",
  pendingPayouts: "/finance/payouts",
  procurement: "/partners/team",
  programRefunds: "/finance/programs",
  rentalRequests: "/plus",
  seats: "/partners/team/plus",
  shopRefunds: "/orders/shop-lines#refunds",
  surveyAppeals: "/customers/surveys#appeals",
  surveys: "/customers/surveys",
  telegram: "/club/telegram",
};

/** Staff roles that see money (refunds, payouts, invoices). */
export const seesMoney = (role: StaffRole) =>
  role === "superadmin" || role === "admin" || role === "finance";

type Count = () => PromiseLike<{ count: number | null }>;

const counted = async (allowed: boolean, query: Count) =>
  allowed ? ((await query()).count ?? 0) : 0;

const sum = async (allowed: boolean, queries: Count[]) =>
  allowed
    ? (await Promise.all(queries.map((query) => counted(true, query)))).reduce(
        (total, value) => total + value,
        0
      )
    : 0;

/** How many decisions of each kind wait (the Inbox's list, for the menu). */
const loadDecisionCounts = async (
  supabase: ServerClient,
  role: StaffRole
): Promise<Record<InboxKind, number>> => {
  const can = (kind: InboxKind) => canRead(role, kindSection[kind]);
  const [support, verifications, checks, returns, shops, applications, queue] =
    await Promise.all([
      counted(can("support"), () =>
        supabase.from("support_tickets").select("id", head).eq("status", "open")
      ),
      sum(can("verifications"), [
        () =>
          supabase
            .from("verification_requests")
            .select("id", head)
            .eq("status", "pending")
            .or("kind.eq.identity,method.eq.documents"),
        () =>
          supabase
            .from("organization_verifications")
            .select("organization_id", head)
            .eq("status", "pending"),
        () =>
          supabase
            .from("student_requests")
            .select("id", head)
            .eq("method", "card")
            .eq("status", "pending"),
        () =>
          supabase
            .from("student_verifications")
            .select("id", head)
            .eq("status", "pending"),
      ]),
      sum(can("checks"), [
        () =>
          supabase
            .from("product_checks")
            .select("id", head)
            .is("resolved_at", null),
        () =>
          supabase
            .from("product_flags")
            .select("id", head)
            .is("resolved_at", null),
      ]),
      sum(can("returns"), [
        () =>
          supabase.from("returns").select("id", head).eq("status", "disputed"),
        ...(seesMoney(role)
          ? [
              () =>
                supabase
                  .from("returns")
                  .select("id", head)
                  .eq("status", "refund_due"),
            ]
          : []),
      ]),
      counted(can("shops"), () =>
        supabase
          .from("sellers")
          .select("id", head)
          .eq("is_house", false)
          .eq("status", "pending")
      ),
      // A minor's application waits for the guardian before review.
      counted(can("applications"), () =>
        supabase
          .from("program_applications")
          .select("id", head)
          .eq("status", "submitted")
          .or("guardian_status.is.null,guardian_status.eq.approved")
      ),
      can("submissions") ? supabase.rpc("review_queue") : null,
    ]);

  return {
    applications,
    checks,
    returns,
    shops,
    submissions: (queue?.data ?? []).filter(
      (row) => row.status === "pending" || row.status === "under_review"
    ).length,
    support,
    verifications,
  };
};

/** The other work waiting on staff, each with the page it's done on. */
const loadOtherWork = async (
  supabase: ServerClient,
  role: StaffRole
): Promise<InboxEntry[]> => {
  const can = (section: Parameters<typeof canRead>[1]) =>
    canRead(role, section);
  const finance = seesMoney(role);
  const today = new Date().toISOString().slice(0, 10);

  const [
    orders,
    rentalRequests,
    overdueRentals,
    telegram,
    procurement,
    seats,
    invoices,
    surveys,
    passApps,
    lateShopLines,
    shopRefunds,
    houseOffers,
    pendingPayouts,
    surveyAppeals,
    opportunities,
    programRefunds,
  ] = await Promise.all([
    counted(can("orders"), () =>
      supabase
        .from("orders")
        .select("id", head)
        .in("status", awaitingFulfilment)
    ),
    counted(can("rentals"), () =>
      supabase.from("rentals").select("id", head).eq("status", "requested")
    ),
    counted(can("rentals"), () =>
      supabase.from("rentals").select("id", head).eq("status", "overdue")
    ),
    counted(can("telegram"), () =>
      supabase.from("telegram_requests").select("id", head).eq("status", "open")
    ),
    counted(can("companies"), () =>
      supabase
        .from("procurement_requests")
        .select("id", head)
        .eq("status", "submitted")
    ),
    counted(can("companies") && finance, () =>
      supabase.from("plus_seats").select("id", head).eq("status", "requested")
    ),
    counted(can("companies") && finance, () =>
      supabase
        .from("invoices")
        .select("id", head)
        .eq("status", "issued")
        .lt("due_on", today)
    ),
    counted(can("customers"), () =>
      supabase.from("surveys").select("id", head).eq("status", "review")
    ),
    counted(can("companies"), () =>
      supabase
        .from("pass_partners")
        .select("client_id", head)
        .eq("review_status", "pending")
    ),
    counted(can("orders"), () =>
      supabase
        .from("order_items")
        .select("id", head)
        .eq("seller_status", "waiting")
        .lt("ready_by", new Date().toISOString())
    ),
    counted(can("orders") && finance, () =>
      supabase
        .from("order_items")
        .select("id, order:orders!inner (paid_at)", head)
        .in("seller_status", ["out_of_stock", "cancelled"])
        .is("refunded_at", null)
        .not("order.paid_at", "is", null)
    ),
    counted(can("catalog"), () =>
      supabase
        .from("offers")
        .select("id", head)
        .eq("seller_id", HOUSE_SELLER_ID)
        .eq("status", "open")
    ),
    counted(can("finance") && finance, () =>
      supabase.from("payouts").select("id", head).eq("status", "pending")
    ),
    counted(can("customers"), () =>
      supabase
        .from("survey_responses")
        .select("id", head)
        .not("appealed_at", "is", null)
        .is("appeal_decided_at", null)
    ),
    counted(can("editorial"), () =>
      supabase.from("opportunities").select("id", head).eq("status", "pending")
    ),
    counted(finance, () =>
      supabase
        .from("program_applications")
        .select("id", head)
        .gt("refund_amount", 0)
        .is("refunded_at", null)
    ),
  ]);

  const counts: Record<InboxItem, number> = {
    houseOffers,
    invoices,
    lateShopLines,
    opportunities,
    orders,
    overdueRentals,
    passApps,
    pendingPayouts,
    procurement,
    programRefunds,
    rentalRequests,
    seats,
    shopRefunds,
    surveyAppeals,
    surveys,
    telegram,
  };

  return inboxItems
    .filter((id) => counts[id] > 0)
    .map((id) => ({ count: counts[id], href: hrefs[id], id }));
};

export interface InboxSummary {
  decisions: Record<InboxKind, number>;
  other: InboxEntry[];
}

/** Everything waiting on the role, loaded once per request. */
export const loadInbox = cache(
  async (supabase: ServerClient, role: StaffRole): Promise<InboxSummary> => {
    const [decisions, other] = await Promise.all([
      loadDecisionCounts(supabase, role),
      loadOtherWork(supabase, role),
    ]);
    return { decisions, other };
  }
);

/**
 * The menu's counts, only where something needs action: the Inbox's
 * decisions, orders to send (and shop lines past their time), and Plus
 * rentals to ship or overdue.
 */
export const menuCounts = ({
  decisions,
  other,
}: InboxSummary): Partial<Record<MenuId, number>> => {
  const of = (id: InboxItem) =>
    other.find((entry) => entry.id === id)?.count ?? 0;
  const counts: Partial<Record<MenuId, number>> = {
    inbox: Object.values(decisions).reduce((total, value) => total + value, 0),
    orders: of("orders") + of("lateShopLines"),
    plus: of("rentalRequests") + of("overdueRentals"),
  };
  return Object.fromEntries(
    Object.entries(counts).filter(([, value]) => (value ?? 0) > 0)
  );
};
