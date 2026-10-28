import { describe, expect, test } from "vitest";
import { toCheckoutError } from "@/lib/errors";

describe("phone verification", () => {
  test("checkout asks to verify an unverified delivery phone", () => {
    expect(
      toCheckoutError({
        code: "23514",
        message: "Verify your phone number first",
      })
    ).toBe("phoneUnverified");
  });
});
