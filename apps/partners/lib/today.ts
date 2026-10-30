import type { Listing } from "./listing-queries";
import type { ShopPayout } from "./payout-queries";
import type { ShopAuction } from "./shop-auction-queries";
import type { ShopOffer } from "./shop-offer-queries";
import type { ShopLine } from "./shop-order-queries";
import type { ParcelBack, ShopReturn } from "./shop-return-queries";

/**
 * Today in Partners: the shop's key numbers and every task waiting for it,
 * by deadline. Pure functions over the rows the Sell pages already load.
 */

export type TaskKind =
  | "invoices"
  | "needsPhoto"
  | "offer"
  | "pack"
  | "parcelBack"
  | "quotes"
  | "returnAnswer"
  | "returnCheck"
  | "unpaidAuction";

export interface Task {
  /** How many, for tasks that stand for several (quotes, invoices). */
  count?: number;
  /** The deadline, or null when there is none. */
  due: string | null;
  href: string;
  id: string;
  kind: TaskKind;
  /** The item, in both languages (empty for counted tasks). */
  name: { ar: string; en: string };
  /** The order or auction number, when there is one. */
  reference?: string;
}

export interface ShopRows {
  auctions: readonly Pick<
    ShopAuction,
    "id" | "number" | "pay_by" | "product" | "status"
  >[];
  lines: readonly Pick<
    ShopLine,
    "line_id" | "name_ar" | "name_en" | "order_number" | "ready_by" | "status"
  >[];
  listings: readonly Pick<
    Listing,
    | "active"
    | "available"
    | "name_ar"
    | "name_en"
    | "product_id"
    | "product_status"
  >[];
  offers: readonly Pick<
    ShopOffer,
    "expires_at" | "id" | "product" | "status"
  >[];
  parcels: readonly Pick<
    ParcelBack,
    "items" | "order_number" | "returned_at" | "shipment_id"
  >[];
  returns: readonly Pick<
    ShopReturn,
    | "check_by"
    | "name_ar"
    | "name_en"
    | "order_number"
    | "respond_by"
    | "return_id"
    | "status"
  >[];
}

const productName = (
  product: { name_ar: string; name_en: string } | null | undefined
) => ({ ar: product?.name_ar ?? "", en: product?.name_en ?? "" });

/** Listings the Store hides: the product is a draft (it needs a photo). */
export const hiddenListings = (listings: ShopRows["listings"]) => {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    if (
      listing.product_status !== "draft" ||
      listing.available < 1 ||
      seen.has(listing.product_id)
    ) {
      return false;
    }
    seen.add(listing.product_id);
    return true;
  });
};

/** The shop's tasks (unsorted). */
const shopTasks = (rows: ShopRows): Task[] => [
  ...rows.offers
    .filter((offer) => offer.status === "open")
    .map(
      (offer): Task => ({
        due: offer.expires_at,
        href: "/sell/offers",
        id: `offer:${offer.id}`,
        kind: "offer",
        name: productName(offer.product),
      })
    ),
  ...rows.lines
    .filter((line) => line.status === "waiting")
    .map(
      (line): Task => ({
        due: line.ready_by || null,
        href: "/sell/orders",
        id: `pack:${line.line_id}`,
        kind: "pack",
        name: { ar: line.name_ar, en: line.name_en },
        reference: line.order_number,
      })
    ),
  ...rows.returns
    .filter((item) => item.status === "requested" || item.status === "received")
    .map(
      (item): Task => ({
        due:
          (item.status === "received" ? item.check_by : item.respond_by) ||
          null,
        href: "/sell/returns",
        id: `return:${item.return_id}`,
        kind: item.status === "received" ? "returnCheck" : "returnAnswer",
        name: { ar: item.name_ar, en: item.name_en },
        reference: item.order_number,
      })
    ),
  ...rows.parcels.map(
    (parcel): Task => ({
      due: null,
      href: "/sell/returns",
      id: `parcel:${parcel.shipment_id}`,
      kind: "parcelBack",
      name: { ar: parcel.items, en: parcel.items },
      reference: parcel.order_number,
    })
  ),
  ...rows.auctions
    .filter((auction) => auction.status === "unpaid")
    .map(
      (auction): Task => ({
        due: auction.pay_by,
        href: "/sell/auctions",
        id: `auction:${auction.id}`,
        kind: "unpaidAuction",
        name: productName(auction.product),
        reference: String(auction.number),
      })
    ),
  ...hiddenListings(rows.listings).map(
    (listing): Task => ({
      due: null,
      href: "/sell/listings#needs-photo",
      id: `photo:${listing.product_id}`,
      kind: "needsPhoto",
      name: { ar: listing.name_ar, en: listing.name_en },
    })
  ),
];

const time = (task: Task) =>
  task.due ? new Date(task.due).getTime() : Number.POSITIVE_INFINITY;

/** Tasks in deadline order; those without a deadline last, in kind order. */
export const sortTasks = (tasks: readonly Task[]) =>
  tasks
    .map((task, index) => ({ index, task }))
    .sort((a, b) => time(a.task) - time(b.task) || a.index - b.index)
    .map(({ task }) => task);

export interface OrganizationCounts {
  quotesToAnswer: number;
  unpaidInvoices: number;
}

/** Everything waiting for the organization, by deadline. */
export const todayTasks = (
  rows: ShopRows | null,
  organization: OrganizationCounts | null
): Task[] => {
  const tasks = rows ? shopTasks(rows) : [];
  if (organization?.quotesToAnswer) {
    tasks.push({
      count: organization.quotesToAnswer,
      due: null,
      href: "/team",
      id: "quotes",
      kind: "quotes",
      name: { ar: "", en: "" },
    });
  }
  if (organization?.unpaidInvoices) {
    tasks.push({
      count: organization.unpaidInvoices,
      due: null,
      href: "/settings/invoices",
      id: "invoices",
      kind: "invoices",
      name: { ar: "", en: "" },
    });
  }
  return sortTasks(tasks);
};

/** The counts the side menu shows: only where something needs action. */
export const actionCounts = (
  rows: Pick<ShopRows, "lines" | "offers" | "parcels" | "returns">
) => ({
  offers: rows.offers.filter((offer) => offer.status === "open").length,
  orders: rows.lines.filter((line) => line.status === "waiting").length,
  returns:
    rows.returns.filter(
      (item) => item.status === "requested" || item.status === "received"
    ).length + rows.parcels.length,
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NOT_SOLD = new Set(["cancelled", "out_of_stock"]);

export interface KeyNumbers {
  liveListings: number;
  nextPayout: { amount: number; periodEnd: string } | null;
  rating: { average: number; count: number } | null;
  salesWeek: number;
}

/** Sales this week, the next payout, live listings and the rating. */
export const keyNumbers = ({
  lines,
  listings,
  now = new Date(),
  payouts,
  ratings,
}: {
  lines: readonly Pick<
    ShopLine,
    "ordered_at" | "quantity" | "status" | "unit_price"
  >[];
  listings: readonly Pick<Listing, "active" | "available" | "product_status">[];
  now?: Date;
  payouts: readonly Pick<ShopPayout, "amount" | "period_end" | "status">[];
  ratings: readonly { average: number | null; count: number | null }[];
}): KeyNumbers => {
  const since = now.getTime() - WEEK_MS;
  const salesWeek = lines
    .filter(
      (line) =>
        !NOT_SOLD.has(line.status) &&
        new Date(line.ordered_at).getTime() >= since
    )
    .reduce((sum, line) => sum + line.unit_price * line.quantity, 0);
  const [pending] = payouts
    .filter((payout) => payout.status === "pending")
    .sort((a, b) => a.period_end.localeCompare(b.period_end));
  const rated = ratings.filter((row) => row.count && row.average !== null);
  const count = rated.reduce((sum, row) => sum + (row.count ?? 0), 0);
  const total = rated.reduce(
    (sum, row) => sum + (row.average ?? 0) * (row.count ?? 0),
    0
  );
  return {
    liveListings: listings.filter(
      (listing) =>
        listing.active &&
        listing.available > 0 &&
        listing.product_status === "active"
    ).length,
    nextPayout: pending
      ? { amount: pending.amount, periodEnd: pending.period_end }
      : null,
    rating: count ? { average: total / count, count } : null,
    salesWeek,
  };
};
