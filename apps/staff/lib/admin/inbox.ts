import "server-only";

import { HOUSE_SELLER_ID } from "@repo/commerce";
import type { StaffRole } from "@repo/database";
import { awaitingFulfilment } from "./fulfilment";
import { canRead } from "./roles";
import type { ServerClient } from "./session";

/**
 * The dashboard's inbox: everything waiting on staff, for the sections the
 * role can open. Each item is a count and where to work on it; only items
 * with something waiting are returned.
 */

export const inboxItems = [
  "tickets",
  "orders",
  "lateShopLines",
  "shopRefunds",
  "disputedReturns",
  "returnRefunds",
  "rentalRequests",
  "overdueRentals",
  "submissions",
  "opportunities",
  "programApplications",
  "surveys",
  "surveyAppeals",
  "studentDocuments",
  "identityChecks",
  "educatorChecks",
  "organizationChecks",
  "passApps",
  "productChecks",
  "productFlags",
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
  disputedReturns: "/orders/returns",
  educatorChecks: "/customers/verifications#educators",
  houseOffers: "/catalog/offers",
  identityChecks: "/customers/verifications#identity",
  invoices: "/partners/invoices",
  lateShopLines: "/orders/shop-lines",
  opportunities: "/club/opportunities#review",
  orders: "/orders?status=awaiting",
  organizationChecks: "/customers/verifications#organizations",
  overdueRentals: "/rentals?view=overdue",
  passApps: "/partners/sign-in",
  pendingPayouts: "/finance/payouts",
  procurement: "/partners/team",
  productChecks: "/catalog/checks",
  productFlags: "/catalog/checks#flags",
  programApplications: "/club/opportunities#applications",
  programRefunds: "/finance/programs",
  rentalRequests: "/rentals",
  returnRefunds: "/orders/returns#refunds",
  seats: "/partners/team/plus",
  shopRefunds: "/orders/shop-lines#refunds",
  studentDocuments: "/customers/students#documents",
  submissions: "/club/submissions",
  surveyAppeals: "/customers/surveys#appeals",
  surveys: "/customers/surveys",
  telegram: "/club/telegram",
  tickets: "/support?status=open",
};

export const loadInbox = async (
  supabase: ServerClient,
  role: StaffRole
): Promise<InboxEntry[]> => {
  const can = (section: Parameters<typeof canRead>[1]) =>
    canRead(role, section);
  const finance = ["superadmin", "admin", "finance"].includes(role);
  const today = new Date().toISOString().slice(0, 10);
  const counted = async (
    allowed: boolean,
    query: () => PromiseLike<{ count: number | null }>
  ) => (allowed ? ((await query()).count ?? 0) : 0);

  const [
    tickets,
    orders,
    rentalRequests,
    overdueRentals,
    queue,
    telegram,
    procurement,
    seats,
    invoices,
    surveys,
    passApps,
    productChecks,
    productFlags,
    lateShopLines,
    shopRefunds,
    disputedReturns,
    returnRefunds,
    houseOffers,
    pendingPayouts,
    surveyAppeals,
    studentDocuments,
    identityChecks,
    educatorChecks,
    organizationChecks,
    opportunities,
    programApplications,
    programRefunds,
  ] = await Promise.all([
    counted(can("support"), () =>
      supabase
        .from("support_tickets")
        .select("id", head)
        .eq("status", "open")
        .is("assigned_to", null)
    ),
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
    can("editorial") ? supabase.rpc("review_queue") : null,
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
    counted(can("catalog"), () =>
      supabase.from("product_checks").select("id", head).is("resolved_at", null)
    ),
    counted(can("catalog"), () =>
      supabase.from("product_flags").select("id", head).is("resolved_at", null)
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
    counted(can("orders"), () =>
      supabase.from("returns").select("id", head).eq("status", "disputed")
    ),
    counted(can("orders") && finance, () =>
      supabase.from("returns").select("id", head).eq("status", "refund_due")
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
    counted(can("customers"), () =>
      supabase
        .from("student_verifications")
        .select("id", head)
        .eq("status", "pending")
    ),
    counted(can("customers"), () =>
      supabase
        .from("verification_requests")
        .select("id", head)
        .eq("kind", "identity")
        .eq("status", "pending")
    ),
    counted(can("customers"), () =>
      supabase
        .from("verification_requests")
        .select("id", head)
        .eq("kind", "educator")
        .eq("method", "documents")
        .eq("status", "pending")
    ),
    counted(can("customers"), () =>
      supabase
        .from("organization_verifications")
        .select("organization_id", head)
        .eq("status", "pending")
    ),
    counted(can("editorial"), () =>
      supabase.from("opportunities").select("id", head).eq("status", "pending")
    ),
    // A minor's application waits for the guardian before review.
    counted(can("editorial"), () =>
      supabase
        .from("program_applications")
        .select("id", head)
        .eq("status", "submitted")
        .or("guardian_status.is.null,guardian_status.eq.approved")
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
    disputedReturns,
    educatorChecks,
    houseOffers,
    identityChecks,
    invoices,
    lateShopLines,
    opportunities,
    orders,
    organizationChecks,
    overdueRentals,
    passApps,
    pendingPayouts,
    procurement,
    productChecks,
    productFlags,
    programApplications,
    programRefunds,
    rentalRequests,
    returnRefunds,
    seats,
    shopRefunds,
    studentDocuments,
    submissions: (queue?.data ?? []).filter(
      (row) => row.status === "pending" || row.status === "under_review"
    ).length,
    surveyAppeals,
    surveys,
    telegram,
    tickets,
  };

  return inboxItems
    .filter((id) => counts[id] > 0)
    .map((id) => ({ count: counts[id], href: hrefs[id], id }));
};
