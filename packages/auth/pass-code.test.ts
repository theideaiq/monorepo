import { describe, expect, test } from "vitest";
import { scannedPass } from "./pass-code";

describe("scannedPass", () => {
  test("keeps a scanned card as it is", () => {
    expect(scannedPass("IDEA:100001:123456", undefined)).toBe(
      "IDEA:100001:123456"
    );
  });

  test("builds it from a typed member number and code", () => {
    expect(scannedPass("№ 100 001", "123 456")).toBe("IDEA:100001:123456");
  });
});
