import { describe, expect, it } from "vitest";
import { redeemError } from "./perk-queries";

describe("redeemError", () => {
  it("maps the database's messages", () => {
    expect(redeemError("Already used today")).toBe("usedToday");
    expect(redeemError("This perk isn't open to them")).toBe("notOpen");
    expect(redeemError("This card isn't valid")).toBe("invalidCard");
    expect(redeemError(undefined)).toBe("failed");
  });
});
