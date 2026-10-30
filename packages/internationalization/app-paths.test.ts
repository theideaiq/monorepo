import { describe, expect, test } from "vitest";
import { businessPath, currentAppPath, safeNextPath } from "./app-paths";

describe("currentAppPath", () => {
  test("sends the old Settings verification cards to /verify", () => {
    expect(currentAppPath("/pass/settings#student")).toBe(
      "/verify?kind=student"
    );
    expect(currentAppPath("/pass/settings#verification")).toBe("/verify");
    expect(currentAppPath("/pass/settings#guardian")).toBe(
      "/pass/settings#guardian"
    );
  });

  test("opens detail pages stored with a query parameter at their URL", () => {
    expect(currentAppPath("/orders/view?id=o%201&x=1")).toBe(
      "/pass/orders/o%201?x=1"
    );
    expect(currentAppPath("/support/view?id=t1")).toBe("/help/t1");
  });

  test("opens pages that moved at their current address", () => {
    expect(currentAppPath("/pass/plus?plan=p1")).toBe("/plus?plan=p1#yours");
    expect(currentAppPath("/pass/selling")).toBe("/pass");
    expect(currentAppPath("/pass/support/t1")).toBe("/help/t1");
    expect(currentAppPath("/pass/wishlist")).toBe("/pass/saved");
    expect(currentAppPath("/club/yours?tab=applications")).toBe(
      "/club?tab=applications#yours"
    );
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

test("businessPath strips Partners' prefix", () => {
  expect(businessPath("/business/developers")).toBe("/developers");
  expect(businessPath("/business/perks?x=1")).toBe("/perks?x=1");
  expect(businessPath("/business")).toBe("/");
  expect(businessPath("/sell/orders")).toBe("/sell/orders");
  expect(businessPath("/sellingstuff")).toBeNull();
  expect(businessPath("/sellers")).toBeNull();
  expect(businessPath("/organizations")).toBeNull();
  expect(businessPath("/businesses")).toBeNull();
  expect(businessPath("/pass")).toBeNull();
  expect(businessPath("/settings")).toBeNull();
});

test("businessPath opens moved pages at their current address", () => {
  expect(businessPath("/business/invoices")).toBe("/settings/invoices");
  expect(businessPath("/business/procurement/r1")).toBe("/team/r1");
  expect(businessPath("/business/procurement?x=1")).toBe("/team?x=1");
  expect(businessPath("/business/settings")).toBe("/settings");
  expect(businessPath("/business/plus-other")).toBe("/plus-other");
  expect(businessPath("/business/organization#verification")).toBe(
    "/settings#verification"
  );
  expect(businessPath("/organization/members")).toBe("/settings/members");
  expect(businessPath("/organization")).toBe("/settings");
});

test("businessPath moves Selling to Sell", () => {
  expect(businessPath("/selling/auctions")).toBe("/sell/auctions");
  expect(businessPath("/selling/orders?line=1")).toBe("/sell/orders?line=1");
  expect(businessPath("/business/selling/offers")).toBe("/sell/offers");
  expect(businessPath("/selling/sales")).toBe("/sell/promotions");
  expect(businessPath("/selling")).toBe("/sell/settings");
  expect(businessPath("/selling#documents")).toBe("/sell/settings#documents");
  expect(businessPath("/selling/pickup")).toBe("/sell/settings");
  expect(businessPath("/selling/get-offers?request=r1")).toBe(
    "/sell/settings?request=r1"
  );
  expect(businessPath("/selling/get-offers/r1")).toBe("/sell/settings");
});

test("safeNextPath refuses other sites", () => {
  expect(safeNextPath("//evil.example")).toBeNull();
  expect(safeNextPath("/pass")).toBe("/pass");
});
