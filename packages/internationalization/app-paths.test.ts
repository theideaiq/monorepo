import { describe, expect, test } from "vitest";
import { businessPath, currentAppPath, safeNextPath } from "./app-paths";

describe("currentAppPath", () => {
  test("sends the old Settings verification cards to /verify", () => {
    expect(currentAppPath("/pass/settings#student")).toBe(
      "/verify?kind=student"
    );
    expect(currentAppPath("/pass/settings#verification")).toBe("/verify");
  });

  test("opens each Settings section at its own page", () => {
    expect(currentAppPath("/pass/settings#phone")).toBe("/pass/settings/phone");
    expect(currentAppPath("/pass/settings#email")).toBe(
      "/pass/settings/sign-in"
    );
    expect(currentAppPath("/pass/settings#sites")).toBe(
      "/pass/settings/connections"
    );
    expect(currentAppPath("/pass/settings#addresses")).toBe(
      "/pass/settings/addresses"
    );
    expect(currentAppPath("/pass/settings#more")).toBe("/pass/settings");
    expect(currentAppPath("/pass/settings")).toBe("/pass/settings");
    expect(currentAppPath("/pass/settings#unknown")).toBe(
      "/pass/settings#unknown"
    );
  });

  test("sends the guardian card and its invites to Family", () => {
    expect(currentAppPath("/pass/settings#guardian")).toBe("/pass/family");
    expect(currentAppPath("/pass/settings?guardian=AB12#guardian")).toBe(
      "/pass/family?guardian=AB12"
    );
    expect(currentAppPath("/pass/settings?guardian=AB12")).toBe(
      "/pass/family?guardian=AB12"
    );
  });

  test("opens Saved's tabs at their pages", () => {
    expect(currentAppPath("/pass/saved?tab=queue")).toBe("/pass/queue");
    expect(currentAppPath("/pass/saved?tab=lists&x=1")).toBe("/pass/lists?x=1");
    expect(currentAppPath("/pass/saved?tab=saved")).toBe("/pass/saved");
    expect(currentAppPath("/pass/saved#offers")).toBe("/pass/saved#offers");
  });

  test("opens detail pages stored with a query parameter at their URL", () => {
    expect(currentAppPath("/orders/view?id=o%201&x=1")).toBe(
      "/pass/orders/o%201?x=1"
    );
    expect(currentAppPath("/support/view?id=t1")).toBe("/help/t1");
  });

  test("opens the parts of Your Plus at their pages", () => {
    expect(currentAppPath("/plus#join")).toBe("/plus/plans");
    expect(currentAppPath("/plus?ref=tg#join")).toBe("/plus/plans?ref=tg");
    expect(currentAppPath("/plus#yours")).toBe("/plus/plan");
    expect(
      currentAppPath("/plus#yours", { event: "plus_swap_booked", kind: "plus" })
    ).toBe("/pass/at-home");
    expect(currentAppPath("/plus#yours", { kind: "rental" })).toBe(
      "/pass/at-home"
    );
    expect(currentAppPath("/plus#yours", { event: "plus_duo_joined" })).toBe(
      "/pass/family"
    );
    expect(currentAppPath("/pass/plus?plan=p1")).toBe("/plus/plan?plan=p1");
    expect(currentAppPath("/plus/duo/c%201")).toBe("/family/c%201");
  });

  test("opens kits and one-off rents in the Store", () => {
    expect(currentAppPath("/kits/game-night")).toBe("/store/kits/game-night");
    expect(currentAppPath("/rent/ps5?variant=v1")).toBe(
      "/store/ps5?variant=v1"
    );
  });

  test("opens Club → Yours in the Pass", () => {
    expect(currentAppPath("/club#yours")).toBe("/pass/tickets");
    expect(currentAppPath("/club#yours", { event: "survey_approved" })).toBe(
      "/pass/applications?tab=surveys"
    );
    expect(currentAppPath("/club/yours?tab=applications")).toBe(
      "/pass/applications"
    );
    expect(currentAppPath("/club/yours?tab=submissions")).toBe(
      "/pass/applications?tab=submissions"
    );
    expect(currentAppPath("/club?tab=following#yours")).toBe(
      "/pass/applications?tab=following"
    );
    expect(currentAppPath("/pass/events")).toBe("/pass/tickets");
    expect(currentAppPath("/pass/submissions")).toBe(
      "/pass/applications?tab=submissions"
    );
  });

  test("opens Club → Join's and Read's views at their pages", () => {
    expect(currentAppPath("/club?show=events")).toBe("/club/events");
    expect(currentAppPath("/club?show=events#join")).toBe("/club/events");
    expect(currentAppPath("/club?show=opportunities")).toBe(
      "/club/opportunities"
    );
    expect(currentAppPath("/club?show=surveys")).toBe("/club/surveys");
    expect(currentAppPath("/club?show=news")).toBe("/club/read?topic=news");
    expect(currentAppPath("/club?topic=guides#read")).toBe(
      "/club/read?topic=guides"
    );
    expect(currentAppPath("/club#read")).toBe("/club/read");
    expect(currentAppPath("/club#join")).toBe("/club");
  });

  test("opens a Club post or event at its page", () => {
    expect(currentAppPath("/club/quiz-night")).toBe("/club/read/quiz-night");
    expect(currentAppPath("/club/quiz-night", { item: "event" })).toBe(
      "/club/events/quiz-night"
    );
    expect(currentAppPath("/post/events/quiz-night")).toBe(
      "/club/events/quiz-night"
    );
    expect(currentAppPath("/post/our-story")).toBe("/club/read/our-story");
    expect(currentAppPath("/post/stories")).toBe("/club/read?topic=stories");
    expect(currentAppPath("/post/learn?ref=tg")).toBe(
      "/club/read?topic=guides&ref=tg"
    );
    expect(currentAppPath("/post")).toBe("/club/read");
  });

  test("opens pages that moved at their current address", () => {
    expect(currentAppPath("/pass/selling")).toBe("/pass");
    expect(currentAppPath("/pass/support/t1")).toBe("/help/t1");
    expect(currentAppPath("/pass/wishlist")).toBe("/pass/saved");
    expect(currentAppPath("/suite")).toBe("/business");
    expect(currentAppPath("/i/SARA1")).toBe("/r/SARA1");
    expect(currentAppPath("/orders")).toBe("/pass/orders");
    expect(currentAppPath("/about/contact")).toBe("/help#contact");
  });

  test("leaves current pages alone", () => {
    for (const path of [
      "/pass/bulbs",
      "/plus",
      "/plus/plans",
      "/club",
      "/club/events/quiz-night",
      "/club/read/our-story",
      "/club/read?topic=news",
      "/club/opportunities/x",
      "/club/surveys/s1/results",
      "/store/ps5",
      "/pass/queue",
      "/family/abc",
    ]) {
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
