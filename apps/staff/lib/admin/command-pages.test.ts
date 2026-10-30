import { matchPages } from "@repo/design-system/lib/command-bar";
import { describe, expect, test } from "vitest";
import { commandPages } from "./command-pages";

describe("the command bar's pages", () => {
  test("follow the menu, then the pages inside each section", () => {
    const hrefs = commandPages("superadmin").map((page) => page.href);
    expect(hrefs.slice(0, 4)).toEqual(["/", "/support", "/orders", "/plus"]);
    expect(hrefs).toContain("/plus/demand");
    expect(hrefs).toContain("/settings/store");
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  test("only what the role can read", () => {
    const editor = commandPages("editor").map((page) => page.href);
    expect(editor).toEqual([
      "/",
      "/club",
      "/club/events",
      "/club/opportunities",
      "/club/submissions",
    ]);
    // Support runs Plus but not the catalog, which holds the plans.
    const support = commandPages("support").map((page) => page.href);
    expect(support).toContain("/plus/demand");
    expect(support).not.toContain("/plus/plans");
    expect(commandPages(null)).toEqual([]);
  });
});

describe("matchPages", () => {
  const pages = [
    { href: "/plus/demand", id: "demand", keywords: ["Plus"], label: "Demand" },
    { href: "/orders", id: "orders", label: "Orders and delivery" },
    { href: "/customers", id: "customers", label: "الزبائن" },
  ];

  test("every word, in the label or the keywords, any case", () => {
    expect(matchPages(pages, "plus dem").map((page) => page.id)).toEqual([
      "demand",
    ]);
    expect(matchPages(pages, "DELIVERY").map((page) => page.id)).toEqual([
      "orders",
    ]);
    expect(matchPages(pages, "  ")).toHaveLength(3);
    expect(matchPages(pages, "nothing")).toEqual([]);
  });

  test("Arabic letter variants match", () => {
    expect(matchPages(pages, "زبائن").map((page) => page.id)).toEqual([
      "customers",
    ]);
  });
});
