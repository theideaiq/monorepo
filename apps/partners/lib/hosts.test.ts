import { describe, expect, test } from "vitest";
import {
  isDesignPath,
  isStaffHost,
  isStaffPath,
  localeSegment,
  toStaffPath,
} from "./hosts";

describe("hosts", () => {
  test("the staff host is NEXT_PUBLIC_STAFF_URL's or any staff. host", () => {
    expect(
      isStaffHost("staff.theideaiq.com", "https://staff.theideaiq.com")
    ).toBe(true);
    expect(isStaffHost("localhost:3003", "http://localhost:3003")).toBe(true);
    expect(isStaffHost("localhost:3000", "http://localhost:3003")).toBe(false);
    expect(isStaffHost("staff.localhost:3000", undefined)).toBe(true);
    expect(
      isStaffHost("partners.theideaiq.com", "https://staff.theideaiq.com")
    ).toBe(false);
    expect(isStaffHost("localhost", "not a url")).toBe(false);
  });

  test("staff paths, with or without a locale", () => {
    expect(isStaffPath("/staff")).toBe(true);
    expect(isStaffPath("/ar/staff/orders")).toBe(true);
    expect(isStaffPath("/en/staff")).toBe(true);
    expect(isStaffPath("/staffing")).toBe(false);
    expect(isStaffPath("/procurement")).toBe(false);
  });

  test("the design site is /design", () => {
    expect(isDesignPath("/design")).toBe(true);
    expect(isDesignPath("/design/index.html")).toBe(true);
    expect(isDesignPath("/designs")).toBe(false);
  });

  test("staff-host paths map into the staff tree", () => {
    expect(toStaffPath("/")).toBe("/staff");
    expect(toStaffPath("/orders")).toBe("/staff/orders");
    expect(toStaffPath("/en")).toBe("/en/staff");
    expect(toStaffPath("/en/")).toBe("/en/staff");
    expect(toStaffPath("/ar/orders/1")).toBe("/ar/staff/orders/1");
    expect(toStaffPath("/arts")).toBe("/staff/arts");
  });

  test("the locale segment defaults to English", () => {
    expect(localeSegment("/ar/x")).toBe("/ar");
    expect(localeSegment("/x")).toBe("/en");
  });
});
