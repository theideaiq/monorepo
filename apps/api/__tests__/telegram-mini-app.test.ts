import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  handleMiniAppSignIn,
  MAX_AGE_SECONDS,
  verifyInitData,
} from "@/lib/telegram-mini-app";

const TOKEN = "123456:test-bot-token";
const NOW = Date.UTC(2026, 10, 5, 12, 0, 0);

/** initData signed like Telegram does. */
const signed = (fields: Record<string, string>, token = TOKEN): string => {
  const check = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secret).update(check).digest("hex");
  return new URLSearchParams({ ...fields, hash }).toString();
};

const fresh = (extra: Record<string, string> = {}) =>
  signed({
    auth_date: String(NOW / 1000 - 30),
    query_id: "AAE",
    user: JSON.stringify({ first_name: "Sara", id: 4242 }),
    ...extra,
  });

describe("verifyInitData", () => {
  it("accepts initData Telegram signed with the bot's token", () => {
    expect(verifyInitData(fresh(), TOKEN, NOW)).toBe(4242);
  });

  it("refuses another bot's signature or a changed field", () => {
    expect(verifyInitData(fresh(), "999:other", NOW)).toBeNull();
    const tampered = fresh().replace("4242", "4243");
    expect(verifyInitData(tampered, TOKEN, NOW)).toBeNull();
  });

  it("refuses initData that is too old, from the future, or unsigned", () => {
    const old = signed({
      auth_date: String(NOW / 1000 - MAX_AGE_SECONDS - 1),
      user: JSON.stringify({ id: 4242 }),
    });
    expect(verifyInitData(old, TOKEN, NOW)).toBeNull();
    const future = signed({
      auth_date: String(NOW / 1000 + 600),
      user: JSON.stringify({ id: 4242 }),
    });
    expect(verifyInitData(future, TOKEN, NOW)).toBeNull();
    expect(verifyInitData("user=%7B%22id%22%3A1%7D", TOKEN, NOW)).toBeNull();
    expect(verifyInitData("", TOKEN, NOW)).toBeNull();
  });

  it("refuses a signed payload without a usable user id", () => {
    const noUser = signed({ auth_date: String(NOW / 1000) });
    expect(verifyInitData(noUser, TOKEN, NOW)).toBeNull();
    const badUser = signed({
      auth_date: String(NOW / 1000),
      user: JSON.stringify({ id: "4242" }),
    });
    expect(verifyInitData(badUser, TOKEN, NOW)).toBeNull();
  });
});

describe("handleMiniAppSignIn", () => {
  const deps = (overrides = {}) => ({
    botToken: TOKEN,
    linkedEmail: vi.fn(async (id: number) =>
      id === 4242 ? "sara@example.com" : null
    ),
    signInToken: vi.fn(async () => "hashed-token"),
    ...overrides,
  });

  it("returns a one-time token for a linked Telegram account", async () => {
    vi.useFakeTimers({ now: NOW });
    const used = deps();
    const result = await handleMiniAppSignIn(
      { initData: fresh() },
      "1.2.3.4",
      used
    );
    vi.useRealTimers();
    expect(result).toEqual({
      body: { ok: true, tokenHash: "hashed-token" },
      status: 200,
    });
    expect(used.signInToken).toHaveBeenCalledWith("sara@example.com");
  });

  it("never issues a token for bad data, an unlinked account or too many tries", async () => {
    vi.useFakeTimers({ now: NOW });
    const used = deps({
      linkedEmail: vi.fn(async () => null),
    });
    expect(
      (await handleMiniAppSignIn({ initData: "x" }, "ip", used)).status
    ).toBe(401);
    expect(
      (await handleMiniAppSignIn({ initData: fresh() }, "ip", used)).status
    ).toBe(404);
    expect((await handleMiniAppSignIn({}, "ip", used)).status).toBe(400);
    expect(
      (
        await handleMiniAppSignIn({ initData: fresh() }, "ip", {
          ...used,
          limit: async () => false,
        })
      ).status
    ).toBe(429);
    expect(
      (
        await handleMiniAppSignIn({ initData: fresh() }, "ip", {
          ...used,
          botToken: undefined,
        })
      ).status
    ).toBe(503);
    vi.useRealTimers();
    expect(used.signInToken).not.toHaveBeenCalled();
  });
});
