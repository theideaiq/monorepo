import "server-only";

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
  "rentalRequests",
  "overdueRentals",
  "tradeIns",
  "submissions",
  "surveys",
  "telegram",
  "affiliates",
  "procurement",
  "jobs",
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
  affiliates: "/affiliates",
  invoices: "/companies/invoices",
  jobs: "/companies/hiring",
  orders: "/orders?status=awaiting",
  overdueRentals: "/rentals?view=overdue",
  procurement: "/companies",
  rentalRequests: "/rentals",
  seats: "/companies/seats",
  submissions: "/editorial/submissions",
  surveys: "/customers/surveys",
  telegram: "/telegram",
  tickets: "/support?status=open",
  tradeIns: "/trade-ins",
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
    tradeIns,
    queue,
    telegram,
    affiliates,
    procurement,
    openJobs,
    seats,
    invoices,
    surveys,
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
    counted(can("tradeIns"), () =>
      supabase.from("trade_ins").select("id", head).eq("status", "submitted")
    ),
    can("editorial") ? supabase.rpc("review_queue") : null,
    counted(can("telegram"), () =>
      supabase.from("telegram_requests").select("id", head).eq("status", "open")
    ),
    counted(can("affiliates"), () =>
      supabase
        .from("affiliates")
        .select("user_id", head)
        .eq("status", "applied")
    ),
    counted(can("companies"), () =>
      supabase
        .from("procurement_requests")
        .select("id", head)
        .eq("status", "submitted")
    ),
    can("companies")
      ? supabase
          .from("job_requests")
          .select("id, candidates (status)")
          .eq("status", "open")
          .limit(200)
      : null,
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
  ]);

  const counts: Record<InboxItem, number> = {
    affiliates,
    invoices,
    // Open jobs nobody has been proposed for yet.
    jobs: (openJobs?.data ?? []).filter(
      (job) =>
        !job.candidates.some((candidate) => candidate.status !== "withdrawn")
    ).length,
    orders,
    overdueRentals,
    procurement,
    rentalRequests,
    seats,
    submissions: (queue?.data ?? []).filter(
      (row) => row.status === "pending" || row.status === "under_review"
    ).length,
    surveys,
    telegram,
    tickets,
    tradeIns,
  };

  return inboxItems
    .filter((id) => counts[id] > 0)
    .map((id) => ({ count: counts[id], href: hrefs[id], id }));
};
