import { describe, expect, it } from "vitest";
import { lastHour } from "@/components/store/auctions";

describe("lastHour", () => {
  it("shows minutes and seconds left in an auction's last hour", () => {
    expect(lastHour(59 * 60 * 1000 + 59_000)).toBe("59:59");
    expect(lastHour(5 * 60 * 1000 + 3000)).toBe("05:03");
  });

  it("rounds a part second up and never goes below zero", () => {
    expect(lastHour(400)).toBe("00:01");
    expect(lastHour(-2000)).toBe("00:00");
  });
});
