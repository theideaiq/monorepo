import { describe, expect, test } from "vitest";
import { toCheckoutError } from "@/lib/errors";
import { kitTotal } from "@/lib/kits";

const dbError = (message: string) => ({ code: "23514", message });

describe("game night kits", () => {
  test("a weekend and its extra days add up", () => {
    expect(kitTotal({ extraDayPrice: 19_750, price: 49_750 }, 2)).toBe(89_250);
    expect(kitTotal(undefined, 1)).toBe(0);
  });

  test("booking refusals say what to change", () => {
    expect(toCheckoutError(dbError("All kits are booked that weekend"))).toBe(
      "kitsFull"
    );
    expect(toCheckoutError(dbError("You need to be 18 or over"))).toBe(
      "adultsOnly"
    );
    expect(toCheckoutError(dbError("Kits are delivered in Baghdad only"))).toBe(
      "baghdadOnly"
    );
    expect(toCheckoutError(dbError("Choose the kit's games"))).toBe(
      "pickGames"
    );
  });
});
