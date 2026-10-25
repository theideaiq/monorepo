import { beforeEach, describe, expect, test, vi } from "vitest";
import { initDataHash } from "../lib/telegram-login/web-app";

const TOKEN = "123456:test-token";
const signInToken = vi.fn();

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_WEB_URL: "https://theideaiq.com",
    TELEGRAM_BOT_TOKEN: TOKEN,
  },
}));
vi.mock("@/lib/telegram-login/sign-in", () => ({
  signInToken: (id: number) => signInToken(id),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { POST } = await import("../app/auth/telegram/web-app/route");
const { unseal } = await import("../lib/telegram-login/oidc");

const initData = (token = TOKEN) => {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ first_name: "Zaid", id: 42, username: "zaid" }),
  });
  params.set("hash", initDataHash(params, token));
  return params.toString();
};

const request = (body: unknown) =>
  new Request("http://localhost/auth/telegram/web-app", {
    body: JSON.stringify(body),
    headers: { origin: "https://theideaiq.com" },
    method: "POST",
  });

describe("POST /auth/telegram/web-app", () => {
  beforeEach(() => signInToken.mockReset());

  test("signs a linked account in", async () => {
    signInToken.mockResolvedValue({ tokenHash: "hash" });
    const response = await POST(request({ initData: initData() }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tokenHash: "hash" });
    expect(signInToken).toHaveBeenCalledWith(42);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://theideaiq.com"
    );
  });

  test("gives a new account a ticket to link", async () => {
    signInToken.mockResolvedValue(null);
    const response = await POST(request({ initData: initData() }));
    const body = (await response.json()) as { name: string; ticket: string };
    expect(body.name).toBe("Zaid");
    expect(unseal(TOKEN, "telegram-link-ticket", body.ticket)).toMatchObject({
      id: 42,
      username: "zaid",
    });
  });

  test("refuses a suspended member", async () => {
    signInToken.mockResolvedValue({ error: "suspended" });
    const response = await POST(request({ initData: initData() }));
    expect(response.status).toBe(403);
  });

  test("refuses initData another bot signed", async () => {
    const response = await POST(request({ initData: initData("1:other") }));
    expect(response.status).toBe(401);
    expect(signInToken).not.toHaveBeenCalled();
  });
});
