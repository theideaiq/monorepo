import { describe, expect, test } from "vitest";
import {
  accessTo,
  canRead,
  canWrite,
  isStaffRole,
  sectionGroups,
  sections,
  visibleGroups,
  visibleSections,
} from "./roles";

describe("role → sections", () => {
  test("superadmins see everything, admins everything but staff", () => {
    expect(visibleSections("superadmin")).toEqual([...sections]);
    expect(visibleSections("admin")).toEqual(
      sections.filter((section) => section !== "staff")
    );
    expect(canWrite("admin", "audit")).toBe(true);
    expect(canWrite("admin", "support")).toBe(true);
    expect(canWrite("admin", "reviews")).toBe(true);
  });

  test("editors only get editorial", () => {
    expect(visibleSections("editor")).toEqual(["dashboard", "editorial"]);
    expect(canWrite("editor", "editorial")).toBe(true);
    expect(canRead("editor", "orders")).toBe(false);
    expect(canRead("editor", "support")).toBe(false);
  });

  test("finance reads orders and runs finance", () => {
    expect(visibleSections("finance")).toEqual([
      "dashboard",
      "orders",
      "affiliates",
      "companies",
      "finance",
    ]);
    expect(accessTo("finance", "orders")).toBe("read");
    expect(canWrite("finance", "orders")).toBe(false);
    expect(canWrite("finance", "finance")).toBe(true);
    expect(canRead("finance", "reviews")).toBe(false);
  });

  test("marketing reads customers (newsletters go out from Resend) and runs affiliates", () => {
    expect(visibleSections("marketing")).toEqual([
      "dashboard",
      "customers",
      "affiliates",
    ]);
    expect(canWrite("marketing", "affiliates")).toBe(true);
    expect(canWrite("marketing", "customers")).toBe(false);
    expect(canRead("marketing", "support")).toBe(false);
  });

  test("support handles customers, tickets, trade-ins, reviews, orders, rentals and Telegram", () => {
    expect(visibleSections("support")).toEqual([
      "dashboard",
      "counter",
      "orders",
      "rentals",
      "customers",
      "support",
      "tradeIns",
      "reviews",
      "companies",
      "telegram",
    ]);
    expect(canWrite("support", "support")).toBe(true);
    expect(canWrite("support", "reviews")).toBe(true);
    expect(canWrite("support", "orders")).toBe(true);
    expect(canWrite("support", "tradeIns")).toBe(true);
    expect(canRead("editor", "tradeIns")).toBe(false);
    expect(canRead("support", "finance")).toBe(false);
  });

  test("every section is in one navigation group", () => {
    const grouped = sectionGroups.flatMap((group) => group.sections);
    expect([...grouped].sort()).toEqual([...sections].sort());
    expect(visibleGroups("editor")).toEqual([
      { id: "today", sections: ["dashboard"] },
      { id: "community", sections: ["editorial"] },
    ]);
  });

  test("no role, no access", () => {
    expect(visibleSections(null)).toEqual([]);
    expect(canRead(undefined, "dashboard")).toBe(false);
  });

  test("isStaffRole", () => {
    expect(isStaffRole("editor")).toBe(true);
    expect(isStaffRole("owner")).toBe(false);
    expect(isStaffRole(3)).toBe(false);
  });
});
