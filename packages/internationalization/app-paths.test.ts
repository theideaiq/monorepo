import { describe, expect, test } from "vitest";
import { businessPath, currentAppPath, safeNextPath } from "./app-paths";

describe("currentAppPath", () => {
  test("opens detail pages stored with a query parameter at their URL", () => {
    expect(currentAppPath("/orders/view?id=o%201&x=1")).toBe(
      "/pass/orders/o%201?x=1"
    );
    expect(currentAppPath("/support/view?id=t1")).toBe("/help/t1");
  });

  test("opens pages that moved at their current address", () => {
    expect(currentAppPath("/pass/plus?plan=p1")).toBe("/plus?plan=p1#yours");
    expect(currentAppPath("/pass/support/t1")).toBe("/help/t1");
    expect(currentAppPath("/pass/wishlist")).toBe("/pass/saved");
    expect(currentAppPath("/post/events/quiz-night")).toBe("/club/quiz-night");
    expect(currentAppPath("/post/stories")).toBe("/club?topic=stories#read");
    expect(currentAppPath("/post/learn?ref=tg")).toBe(
      "/club?topic=guides&ref=tg#read"
    );
    expect(currentAppPath("/club?show=news")).toBe("/club?topic=news#read");
    expect(currentAppPath("/club?show=events")).toBe("/club?show=events");
    expect(currentAppPath("/suite")).toBe("/business");
    expect(currentAppPath("/i/SARA1")).toBe("/r/SARA1");
    expect(currentAppPath("/orders")).toBe("/pass/orders");
  });

  test("leaves current pages alone", () => {
    for (const path of ["/pass/bulbs", "/plus", "/club/x", "/store/ps5"]) {
      expect(currentAppPath(path)).toBe(path);
    }
  });
});

test("businessPath strips The IDEA Partners's prefix", () => {
  expect(businessPath("/business/developers")).toBe("/developers");
  expect(businessPath("/business/perks?x=1")).toBe("/perks?x=1");
  expect(businessPath("/business")).toBe("/");
  expect(businessPath("/businesses")).toBeNull();
  expect(businessPath("/pass")).toBeNull();
});

test("businessPath opens moved pages at their current address", () => {
  expect(businessPath("/business/invoices")).toBe("/organization/invoices");
  expect(businessPath("/business/procurement/r1")).toBe("/team/r1");
  expect(businessPath("/business/procurement?x=1")).toBe("/team?x=1");
  expect(businessPath("/business/settings")).toBe("/organization");
  expect(businessPath("/business/plus-other")).toBe("/plus-other");
});

test("safeNextPath refuses other sites", () => {
  expect(safeNextPath("//evil.example")).toBeNull();
  expect(safeNextPath("/pass")).toBe("/pass");
});
