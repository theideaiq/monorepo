import { beforeEach, describe, expect, test, vi } from "vitest";
import { isValidTelegramSecret } from "../lib/telegram-secret";

const SECRET = "a".repeat(64);
const handleUpdate = vi.fn();
const getDroid = vi.fn();

vi.mock("@/env", () => ({ env: { TELEGRAM_WEBHOOK_SECRET: SECRET } }));
vi.mock("@/lib/telegram", () => ({ getDroid: () => getDroid() }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { POST } = await import("../app/telegram/webhook/route");

const request = (body: unknown, secret: string | null = SECRET): Request =>
  new Request("http://localhost/telegram/webhook", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: secret ? { "X-Telegram-Bot-Api-Secret-Token": secret } : {},
    method: "POST",
  });

describe("isValidTelegramSecret", () => {
  test("accepts only the exact secret", () => {
    expect(isValidTelegramSecret(SECRET, SECRET)).toBe(true);
    expect(isValidTelegramSecret(`${SECRET}x`, SECRET)).toBe(false);
    expect(isValidTelegramSecret("b".repeat(64), SECRET)).toBe(false);
    expect(isValidTelegramSecret("", SECRET)).toBe(false);
    expect(isValidTelegramSecret(null, SECRET)).toBe(false);
  });

  test("fails closed without a configured secret", () => {
    expect(isValidTelegramSecret("", undefined)).toBe(false);
    expect(isValidTelegramSecret("anything", undefined)).toBe(false);
  });
});

describe("POST /telegram/webhook", () => {
  beforeEach(() => {
    handleUpdate.mockReset();
    getDroid.mockReset();
    getDroid.mockReturnValue(Promise.resolve({ handleUpdate }));
  });

  test("rejects requests without the right secret", async () => {
    expect((await POST(request({ update_id: 1 }, "wrong"))).status).toBe(401);
    expect((await POST(request({ update_id: 1 }, null))).status).toBe(401);
    expect(handleUpdate).not.toHaveBeenCalled();
  });

  test("hands valid updates to the bot", async () => {
    const response = await POST(request({ message: {}, update_id: 7 }));
    expect(response.status).toBe(200);
    expect(handleUpdate).toHaveBeenCalledWith({ message: {}, update_id: 7 });
  });

  test("answers 200 when handling fails, so Telegram doesn't retry forever", async () => {
    handleUpdate.mockRejectedValue(new Error("boom"));
    expect((await POST(request({ update_id: 8 }))).status).toBe(200);
  });

  test("rejects malformed bodies", async () => {
    expect((await POST(request("not json"))).status).toBe(400);
    expect((await POST(request({ hello: "world" }))).status).toBe(400);
  });

  test("answers 503 while the bot isn't configured", async () => {
    getDroid.mockReturnValue(undefined);
    expect((await POST(request({ update_id: 9 }))).status).toBe(503);
  });
});
