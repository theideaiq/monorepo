import { describe, expect, test } from "vitest";
import {
  formatMemberNumber,
  passCode,
  passCodeStep,
  passPayload,
  secondsLeft,
} from "@/lib/pass-code";

// RFC 6238, appendix B: the SHA-1 seed "12345678901234567890".
const RFC_SECRET = Buffer.from("12345678901234567890").toString("hex");

describe("The IDEA Pass card code", () => {
  test("matches the RFC 6238 test vectors (last 6 digits)", async () => {
    expect(await passCode(RFC_SECRET, passCodeStep(59_000))).toBe("287082");
    expect(await passCode(RFC_SECRET, passCodeStep(1_111_111_109_000))).toBe(
      "081804"
    );
    expect(await passCode(RFC_SECRET, passCodeStep(20_000_000_000_000))).toBe(
      "353130"
    );
  });

  test("changes every 30 seconds", () => {
    expect(passCodeStep(29_999)).toBe(0);
    expect(passCodeStep(30_000)).toBe(1);
    expect(secondsLeft(0)).toBe(30);
    expect(secondsLeft(29_000)).toBe(1);
  });

  test("the QR payload and the printed number", () => {
    expect(passPayload(100_123, "012345")).toBe("IDEA:100123:012345");
    expect(formatMemberNumber(100_123)).toBe("100 123");
  });
});
