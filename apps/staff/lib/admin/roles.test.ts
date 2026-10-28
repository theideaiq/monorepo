import { describe, expect, test } from "vitest";
import {
  accessTo,
  canRead,
  canWrite,
  isStaffRole,
  menu,
  sections,
  visibleMenu,
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
      "companies",
      "finance",
    ]);
    expect(accessTo("finance", "orders")).toBe("read");
    expect(canWrite("finance", "orders")).toBe(false);
    expect(canWrite("finance", "finance")).toBe(true);
    expect(canRead("finance", "reviews")).toBe(false);
  });

  test("marketing reads customers (newsletters go out from Resend)", () => {
    expect(visibleSections("marketing")).toEqual(["dashboard", "customers"]);
    expect(canWrite("marketing", "customers")).toBe(false);
    expect(canRead("marketing", "support")).toBe(false);
  });

  test("support handles customers, tickets, reviews, orders, rentals and Telegram", () => {
    expect(visibleSections("support")).toEqual([
      "dashboard",
      "orders",
      "rentals",
      "customers",
      "support",
      "reviews",
      "companies",
      "telegram",
    ]);
    expect(canWrite("support", "support")).toBe(true);
    expect(canWrite("support", "reviews")).toBe(true);
    expect(canWrite("support", "orders")).toBe(true);
    expect(canRead("support", "finance")).toBe(false);
  });

  test("every section is in one menu entry", () => {
    const listed = menu.flatMap((entry) => entry.sections);
    expect([...listed].sort()).toEqual([...sections].sort());
  });

  test("the menu opens the first section the role can read", () => {
    expect(visibleMenu("editor")).toEqual([
      { id: "inbox", label: "dashboard", sections: ["dashboard"] },
      { id: "club", label: "editorial", sections: ["editorial"] },
    ]);
    // Support has Telegram and Reviews, without Editorial or the Catalog.
    expect(visibleMenu("support").find((entry) => entry.id === "club")).toEqual(
      { id: "club", label: "editorial", sections: ["telegram"] }
    );
    expect(
      visibleMenu("support").find((entry) => entry.id === "catalog")
    ).toEqual({ id: "catalog", label: "catalog", sections: ["reviews"] });
    expect(visibleMenu("superadmin").map((entry) => entry.id)).toEqual([
      "inbox",
      "catalog",
      "orders",
      "rentals",
      "customers",
      "club",
      "partners",
      "finance",
      "settings",
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
