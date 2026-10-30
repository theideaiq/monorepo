import { describe, expect, test } from "vitest";
import { toAgeError, toCheckoutError } from "@/lib/errors";
import { guardianInviteUrl } from "@/lib/guardian";

const dbError = (message: string) => ({ code: "23514", message });
const apiError = (code: string) => ({ code, name: "ApiError" });

describe("ages", () => {
  test("names the age rule that refused an action", () => {
    expect(toAgeError(dbError("You need to be 18 or over"))).toBe("adultsOnly");
    expect(toAgeError(dbError("Add your date of birth first"))).toBe(
      "needsBirthday"
    );
    expect(toAgeError(apiError("guardian_required"))).toBe("guardianRequired");
    expect(toAgeError(dbError("Not enough stock"))).toBeNull();
  });

  test("checkout explains a teen's missing guardian and PEGI 18 items", () => {
    expect(
      toCheckoutError(dbError("A guardian must approve your orders"))
    ).toBe("guardianRequired");
    expect(toCheckoutError(dbError("Not available under 18"))).toBe(
      "notForMinors"
    );
  });

  test("the guardian's invite link opens Family with the code", () => {
    expect(guardianInviteUrl("https://theideaiq.com", "AB12CD34EF")).toBe(
      "https://theideaiq.com/pass/family?guardian=AB12CD34EF"
    );
  });
});
