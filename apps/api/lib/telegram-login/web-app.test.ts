import { describe, expect, it } from "vitest";
import { initDataHash, verifyInitData } from "./web-app";

const TOKEN = "123456:test-token";
const NOW = 1_800_000_000_000;

const signed = (fields: Record<string, string>, token = TOKEN) => {
  const params = new URLSearchParams(fields);
  params.set("hash", initDataHash(params, token));
  return params.toString();
};

const user = JSON.stringify({
  first_name: "Zaid",
  id: 42,
  language_code: "ar",
  username: "zaid",
});

describe("verifyInitData", () => {
  it("returns the user of initData signed with the bot's token", () => {
    const initData = signed({
      auth_date: String(NOW / 1000 - 30),
      query_id: "AAE",
      user,
    });
    expect(verifyInitData(initData, TOKEN, { now: NOW })).toEqual({
      firstName: "Zaid",
      id: 42,
      languageCode: "ar",
      lastName: null,
      username: "zaid",
    });
  });

  it("refuses another bot's signature or a changed field", () => {
    const fields = { auth_date: String(NOW / 1000), user };
    expect(verifyInitData(signed(fields, "1:other"), TOKEN, { now: NOW })).toBe(
      null
    );
    const tampered = signed(fields).replace("zaid", "admin");
    expect(verifyInitData(tampered, TOKEN, { now: NOW })).toBe(null);
    expect(verifyInitData("user=x", TOKEN, { now: NOW })).toBe(null);
  });

  it("refuses initData older than an hour", () => {
    const initData = signed({ auth_date: String(NOW / 1000 - 3601), user });
    expect(verifyInitData(initData, TOKEN, { now: NOW })).toBe(null);
  });

  it("refuses initData without a user", () => {
    const initData = signed({ auth_date: String(NOW / 1000) });
    expect(verifyInitData(initData, TOKEN, { now: NOW })).toBe(null);
  });
});
