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

  test("passes a student check's code on as it is", () => {
    expect(scannedPass("STUDENT:K7M2QX9P", undefined)).toBe("STUDENT:K7M2QX9P");
    expect(scannedPass(" k7m2-qx9p ", "")).toBe("k7m2-qx9p");
  });

  test("an 8-digit Pass number is still a Pass number", () => {
    expect(scannedPass("23456789", "123456")).toBe("IDEA:23456789:123456");
  });
});
