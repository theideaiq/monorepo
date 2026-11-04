import { describe, expect, test } from "vitest";
import { databaseError, errorFields, failure } from "./action-state";
import {
  byPosition,
  countryName,
  requirementRow,
  requirementSchema,
  routeNeedsCheck,
  routeRow,
  routeSchema,
} from "./travel";

const ROUTE = "00000000-0000-4000-8000-000000000001";
const OPPORTUNITY = "00000000-0000-4000-8000-000000000002";

// Placeholder values only: the editors enter the real requirements.
const line = (extra: Record<string, string> = {}) => ({
  checkedOn: "2026-11-01",
  confidence: "unconfirmed",
  kind: "task",
  routeId: ROUTE,
  sourceUrl: "https://example.org/source",
  titleAr: "سطر",
  titleEn: "Line",
  ...extra,
});

describe("travel routes", () => {
  const route = {
    checkedOn: "",
    country: " de ",
    slug: "Some-Route",
    status: "draft",
    visaAr: "نوع",
    visaEn: "Type",
  };

  test("cleans the code and slug, empty texts become null", () => {
    const parsed = routeSchema.parse(route);
    expect(parsed.country).toBe("DE");
    expect(parsed.slug).toBe("some-route");
    expect(routeRow(parsed)).toMatchObject({
      apply_at_ar: null,
      checked_on: null,
      country: "DE",
      note_en: null,
      status: "draft",
    });
  });

  test("refuses a bad country code or slug", () => {
    expect(routeSchema.safeParse({ ...route, country: "DEU" }).success).toBe(
      false
    );
    expect(routeSchema.safeParse({ ...route, slug: "a--b" }).success).toBe(
      false
    );
  });

  test("publishing needs a checked date", () => {
    expect(routeNeedsCheck({ checkedOn: null, status: "published" })).toBe(
      true
    );
    expect(
      routeNeedsCheck({ checkedOn: "2026-11-01", status: "published" })
    ).toBe(false);
    expect(routeNeedsCheck({ checkedOn: null, status: "draft" })).toBe(false);
  });

  test("the database's check is explained, not a bare invalid", () => {
    const key = databaseError({
      code: "23514",
      message:
        'new row for relation "travel_routes" violates check constraint "travel_routes_check"',
    });
    expect(key).toBe("routeNeedsCheck");
    expect(failure(key, errorFields[key]).status).toBe("error");
    expect(errorFields[key]).toEqual(["status", "checkedOn"]);
    // A column's own check stays invalid.
    expect(
      databaseError({
        code: "23514",
        message:
          'new row for relation "travel_routes" violates check constraint "travel_routes_country_check"',
      })
    ).toBe("invalid");
  });
});

describe("travel requirements", () => {
  test("a task keeps no document key and no lead without an anchor", () => {
    const parsed = requirementSchema.parse(line({ docKey: "passport" }));
    expect(requirementRow(parsed)).toMatchObject({
      anchor: null,
      copies: null,
      doc_key: null,
      kind: "task",
      lead_days: null,
      minors_only: false,
      position: 0,
      source_url: "https://example.org/source",
    });
  });

  test("a document needs its key", () => {
    expect(
      requirementSchema.safeParse(line({ kind: "document" })).success
    ).toBe(false);
    const parsed = requirementSchema.parse(
      line({ docKey: "Passport", kind: "document" })
    );
    expect(requirementRow(parsed).doc_key).toBe("passport");
    expect(
      requirementSchema.safeParse(line({ docKey: "x", kind: "document" }))
        .success
    ).toBe(false);
  });

  test("an anchor goes with its days", () => {
    expect(
      requirementSchema.safeParse(line({ anchor: "departure" })).success
    ).toBe(false);
    expect(requirementSchema.safeParse(line({ leadDays: "5" })).success).toBe(
      false
    );
    const parsed = requirementSchema.parse(
      line({ anchor: "appointment", copies: "2", leadDays: "14" })
    );
    expect(requirementRow(parsed)).toMatchObject({
      anchor: "appointment",
      copies: 2,
      lead_days: 14,
    });
  });

  test("source, date and confidence are required", () => {
    expect(
      requirementSchema.safeParse(line({ sourceUrl: "example.org" })).success
    ).toBe(false);
    expect(
      requirementSchema.safeParse(line({ sourceUrl: "ftp://example.org" }))
        .success
    ).toBe(false);
    expect(requirementSchema.safeParse(line({ checkedOn: "" })).success).toBe(
      false
    );
    expect(
      requirementSchema.safeParse(line({ confidence: "maybe" })).success
    ).toBe(false);
  });

  test("a new line belongs to a route or a program, not both", () => {
    expect(
      requirementSchema.safeParse(line({ opportunityId: OPPORTUNITY })).success
    ).toBe(false);
    expect(requirementSchema.safeParse(line({ routeId: "" })).success).toBe(
      false
    );
    expect(
      requirementSchema.safeParse(
        line({ opportunityId: OPPORTUNITY, routeId: "" })
      ).success
    ).toBe(true);
    // An edit keeps its parent.
    expect(
      requirementSchema.safeParse(line({ id: ROUTE, routeId: "" })).success
    ).toBe(true);
  });

  test("ordered by position, then oldest first", () => {
    const rows = byPosition([
      { created_at: "2026-11-02", id: "c", position: 1 },
      { created_at: "2026-11-03", id: "b", position: 0 },
      { created_at: "2026-11-01", id: "a", position: 0 },
    ]);
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  test("country names", () => {
    expect(countryName("DE", "en")).toBe("Germany");
    // Not a region code at all: shown as it is.
    expect(countryName("??", "en")).toBe("??");
  });
});
