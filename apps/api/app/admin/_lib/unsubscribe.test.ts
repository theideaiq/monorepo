import { describe, expect, test } from "vitest";
import {
  createUnsubscribeToken,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from "./unsubscribe";

const SECRET = "sb_secret_test_key";
const USER = "0f8e9a1c-2b3d-4e5f-8a7b-9c0d1e2f3a4b";

describe("unsubscribe tokens", () => {
  test("round-trip", () => {
    const token = createUnsubscribeToken(SECRET, USER);
    expect(verifyUnsubscribeToken(SECRET, token)).toBe(USER);
  });

  test("reject tampering, other keys and junk", () => {
    const token = createUnsubscribeToken(SECRET, USER);
    const other = "1f8e9a1c-2b3d-4e5f-8a7b-9c0d1e2f3a4b";
    expect(
      verifyUnsubscribeToken(SECRET, token.replace(USER, other))
    ).toBeNull();
    expect(verifyUnsubscribeToken("sb_secret_other", token)).toBeNull();
    expect(verifyUnsubscribeToken(SECRET, `${token}.x`)).toBeNull();
    expect(verifyUnsubscribeToken(SECRET, "not-a-token")).toBeNull();
    expect(verifyUnsubscribeToken(SECRET, null)).toBeNull();
  });

  test("link", () => {
    const url = new URL(
      unsubscribeUrl("https://api.theideaiq.com", SECRET, USER, "en")
    );
    expect(url.pathname).toBe("/admin/unsubscribe");
    expect(url.searchParams.get("lang")).toBe("en");
    expect(verifyUnsubscribeToken(SECRET, url.searchParams.get("token"))).toBe(
      USER
    );
  });
});
