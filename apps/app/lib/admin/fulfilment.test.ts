import { expect, test } from "vitest";
import { nextOrderStatuses, nextRentalStatuses } from "./fulfilment";

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
