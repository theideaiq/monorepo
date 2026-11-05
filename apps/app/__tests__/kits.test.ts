import { describe, expect, test } from "vitest";
import { toCheckoutError } from "@/lib/errors";
import { kitTotal, upcomingGameNights } from "@/lib/kits";

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

describe("upcomingGameNights", () => {
  const night = (startsOn: string, endsOn: string, status = "booked") => ({
    endsOn,
    startsOn,
    status,
  });
  // Saturday 14 November 2026, 23:30 in Baghdad.
  const now = new Date("2026-11-14T20:30:00Z");

  test("keeps booked and out nights not yet collected, soonest first", () => {
    expect(
      upcomingGameNights(
        [
          night("2026-11-26", "2026-11-28"),
          night("2026-11-12", "2026-11-14", "out"),
          night("2026-11-05", "2026-11-07", "returned"),
          night("2026-11-19", "2026-11-21", "cancelled"),
          night("2026-11-05", "2026-11-07"),
        ],
        now
      ).map((item) => item.startsOn)
    ).toEqual(["2026-11-12", "2026-11-26"]);
  });

  test("uses Baghdad's day, not UTC's", () => {
    // 00:30 Sunday in Baghdad, still Saturday in UTC.
    const sunday = new Date("2026-11-14T21:30:00Z");
    expect(
      upcomingGameNights([night("2026-11-12", "2026-11-14", "out")], sunday)
    ).toEqual([]);
  });
});
