import { describe, expect, test } from "vitest";
import {
  accessTo,
  canRead,
  canWrite,
  isStaffRole,
  sections,
  visibleSections,
} from "./roles";

describe("role → sections", () => {
  test("superadmins see everything, admins everything but staff", () => {
    expect(visibleSections("superadmin")).toEqual([...sections]);
    expect(visibleSections("admin")).toEqual(
      sections.filter((section) => section !== "staff")
    );
    expect(canWrite("admin", "audit")).toBe(true);
  });

  test("editors only get editorial", () => {
    expect(visibleSections("editor")).toEqual(["dashboard", "editorial"]);
    expect(canWrite("editor", "editorial")).toBe(true);
    expect(canRead("editor", "orders")).toBe(false);
  });

  test("finance reads orders and runs finance", () => {
    expect(visibleSections("finance")).toEqual([
      "dashboard",
      "orders",
      "finance",
    ]);
    expect(accessTo("finance", "orders")).toBe("read");
    expect(canWrite("finance", "orders")).toBe(false);
    expect(canWrite("finance", "finance")).toBe(true);
  });

  test("marketing reads customers and runs marketing", () => {
    expect(visibleSections("marketing")).toEqual([
      "dashboard",
      "customers",
      "marketing",
    ]);
    expect(canWrite("marketing", "customers")).toBe(false);
    expect(canWrite("marketing", "marketing")).toBe(true);
  });

  test("support handles customers, orders, rentals and Telegram", () => {
    expect(visibleSections("support")).toEqual([
      "dashboard",
      "orders",
      "rentals",
      "customers",
      "telegram",
    ]);
    expect(canWrite("support", "orders")).toBe(true);
    expect(canRead("support", "finance")).toBe(false);
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
