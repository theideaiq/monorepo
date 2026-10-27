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
  "submissions",
  "surveys",
  "passApps",
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
  invoices: "/companies/invoices",
  orders: "/orders?status=awaiting",
  overdueRentals: "/rentals?view=overdue",
  passApps: "/companies/sign-in",
  procurement: "/companies",
  rentalRequests: "/rentals",
  seats: "/companies/seats",
  submissions: "/editorial/submissions",
  surveys: "/customers/surveys",
  telegram: "/telegram",
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
  ]);

  const counts: Record<InboxItem, number> = {
    invoices,
    orders,
    overdueRentals,
    passApps,
    procurement,
    rentalRequests,
    seats,
    submissions: (queue?.data ?? []).filter(
      (row) => row.status === "pending" || row.status === "under_review"
    ).length,
    surveys,
    telegram,
    tickets,
  };

  return inboxItems
    .filter((id) => counts[id] > 0)
    .map((id) => ({ count: counts[id], href: hrefs[id], id }));
};
