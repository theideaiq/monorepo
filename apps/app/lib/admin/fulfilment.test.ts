import { expect, test } from "vitest";
import {
  canCollectCash,
  nextOrderStatuses,
  nextRentalStatuses,
} from "./fulfilment";

test("order moves match the database guard", () => {
  expect(nextOrderStatuses("paid")).toEqual(["processing", "shipped"]);
  expect(nextOrderStatuses("shipped")).toEqual(["delivered"]);
  expect(nextOrderStatuses("delivered")).toEqual([]);
  expect(nextOrderStatuses("refunded")).toEqual([]);
});

test("rental moves match the database trigger", () => {
  expect(nextRentalStatuses("requested")).toEqual(["active", "cancelled"]);
  expect(nextRentalStatuses("overdue")).toEqual(["returned", "active"]);
  expect(nextRentalStatuses("returned")).toEqual([]);
});

test("unpaid cash orders can be cancelled until the cash is in", () => {
  const unpaid = { cash: true, paid: false };
  expect(nextOrderStatuses("confirmed", unpaid)).toEqual([
    "processing",
    "shipped",
    "cancelled",
  ]);
  expect(nextOrderStatuses("processing", unpaid)).toEqual([
    "shipped",
    "cancelled",
  ]);
  expect(nextOrderStatuses("shipped", unpaid)).toEqual(["cancelled"]);
  expect(nextOrderStatuses("shipped", { cash: true, paid: true })).toEqual([
    "delivered",
  ]);
  expect(canCollectCash("shipped", unpaid)).toBe(true);
  expect(canCollectCash("pending", unpaid)).toBe(false);
  expect(canCollectCash("shipped", { cash: false, paid: false })).toBe(false);
});
