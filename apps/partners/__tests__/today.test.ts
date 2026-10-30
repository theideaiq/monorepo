import { describe, expect, test } from "vitest";
import {
  actionCounts,
  hiddenListings,
  keyNumbers,
  type ShopRows,
  todayTasks,
} from "@/lib/today";

const name = { name_ar: "اسم", name_en: "Name" };

const rows: ShopRows = {
  auctions: [
    {
      id: "a1",
      number: 12,
      pay_by: "2026-10-29T10:00:00Z",
      product: name,
      status: "unpaid",
    },
    {
      id: "a2",
      number: 13,
      pay_by: null,
      product: name,
      status: "live",
    },
  ],
  lines: [
    {
      line_id: "l1",
      ...name,
      order_number: "1001",
      ready_by: "2026-10-31T09:00:00Z",
      status: "waiting",
    },
    {
      line_id: "l2",
      ...name,
      order_number: "1002",
      ready_by: "",
      status: "ready",
    },
  ],
  listings: [
    {
      active: true,
      available: 2,
      ...name,
      product_id: "p1",
      product_status: "draft",
    },
    {
      active: true,
      available: 1,
      ...name,
      product_id: "p1",
      product_status: "draft",
    },
    {
      active: true,
      available: 0,
      ...name,
      product_id: "p2",
      product_status: "draft",
    },
    {
      active: true,
      available: 3,
      ...name,
      product_id: "p3",
      product_status: "active",
    },
  ],
  offers: [
    {
      expires_at: "2026-10-30T20:00:00Z",
      id: "o1",
      product: name,
      status: "open",
    },
    {
      expires_at: "2026-10-30T08:00:00Z",
      id: "o2",
      product: name,
      status: "declined",
    },
  ],
  parcels: [
    {
      items: "Name",
      order_number: "1003",
      returned_at: "2026-10-28T10:00:00Z",
      shipment_id: "s1",
    },
  ],
  returns: [
    {
      check_by: "2026-11-01T10:00:00Z",
      ...name,
      order_number: "1004",
      respond_by: "",
      return_id: "r1",
      status: "received",
    },
    {
      check_by: "",
      ...name,
      order_number: "1005",
      respond_by: "2026-10-30T12:00:00Z",
      return_id: "r2",
      status: "requested",
    },
    {
      check_by: "",
      ...name,
      order_number: "1006",
      respond_by: "",
      return_id: "r3",
      status: "refunded",
    },
  ],
} as unknown as ShopRows;

describe("Today", () => {
  test("lists every task in deadline order, undated ones last", () => {
    const tasks = todayTasks(rows, { quotesToAnswer: 2, unpaidInvoices: 0 });
    expect(tasks.map((task) => task.id)).toEqual([
      "auction:a1",
      "return:r2",
      "offer:o1",
      "pack:l1",
      "return:r1",
      "parcel:s1",
      "photo:p1",
      "quotes",
    ]);
    expect(tasks.find((task) => task.id === "return:r1")?.kind).toBe(
      "returnCheck"
    );
    expect(tasks.find((task) => task.id === "pack:l1")).toMatchObject({
      href: "/sell/orders",
      reference: "1001",
    });
  });

  test("without a shop, shows the organization's own tasks", () => {
    expect(
      todayTasks(null, { quotesToAnswer: 0, unpaidInvoices: 3 })
    ).toMatchObject([{ count: 3, href: "/settings/invoices", id: "invoices" }]);
  });

  test("hidden listings: drafts with copies, once per product", () => {
    expect(
      hiddenListings(rows.listings).map((listing) => listing.product_id)
    ).toEqual(["p1"]);
  });

  test("the menu counts offers, orders to pack and returns", () => {
    expect(actionCounts(rows)).toEqual({ offers: 1, orders: 1, returns: 3 });
  });

  test("key numbers", () => {
    const numbers = keyNumbers({
      lines: [
        {
          ordered_at: "2026-10-29T10:00:00Z",
          quantity: 2,
          status: "waiting",
          unit_price: 10_000,
        },
        {
          ordered_at: "2026-10-28T10:00:00Z",
          quantity: 1,
          status: "cancelled",
          unit_price: 50_000,
        },
        {
          ordered_at: "2026-10-01T10:00:00Z",
          quantity: 1,
          status: "picked_up",
          unit_price: 50_000,
        },
      ],
      listings: rows.listings,
      now: new Date("2026-10-30T10:00:00Z"),
      payouts: [
        { amount: 90_000, period_end: "2026-10-25", status: "paid" },
        { amount: 40_000, period_end: "2026-11-01", status: "pending" },
      ],
      ratings: [
        { average: 4, count: 1 },
        { average: 5, count: 3 },
        { average: null, count: 0 },
      ],
    });
    expect(numbers).toEqual({
      liveListings: 1,
      nextPayout: { amount: 40_000, periodEnd: "2026-11-01" },
      rating: { average: 4.75, count: 4 },
      salesWeek: 20_000,
    });
  });
});
