import { describe, expect, test } from "vitest";
import {
  looksLikeCode,
  offerProblem,
  toListingProblem,
} from "@/lib/listing-queries";

describe("listings", () => {
  test("tells barcodes from titles", () => {
    expect(looksLikeCode("9780441172719")).toBe(true);
    expect(looksLikeCode("0-441-17271-7")).toBe(true);
    expect(looksLikeCode("044117271X")).toBe(true);
    expect(looksLikeCode("Dune")).toBe(false);
    expect(looksLikeCode("1984")).toBe(false);
  });

  test("checks offers as the database does", () => {
    const offer = {
      condition: "new" as const,
      price: 9750,
      quantity: 2,
      sku: "",
    };
    expect(offerProblem(offer)).toBeNull();
    expect(offerProblem({ ...offer, price: 100 })).toBe("price");
    expect(offerProblem({ ...offer, price: Number.NaN })).toBe("price");
    expect(offerProblem({ ...offer, quantity: 1000 })).toBe("quantity");
    expect(offerProblem({ ...offer, quantity: 0 })).toBeNull();
  });

  test("names the database's refusals", () => {
    expect(toListingProblem({ message: "Product exists" })).toBe("exists");
    expect(toListingProblem({ message: "Invalid barcode" })).toBe(
      "invalidBarcode"
    );
    expect(
      toListingProblem({
        message: "Only owners and admins of an approved shop can list",
      })
    ).toBe("notAllowed");
    expect(toListingProblem(new Error("boom"))).toBe("unknown");
  });
});
