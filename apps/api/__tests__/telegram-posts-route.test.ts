import { beforeEach, describe, expect, test, vi } from "vitest";

const SECRET = "s".repeat(32);
const deliver = vi.fn();
const getDroid = vi.fn();

vi.mock("@/env", () => ({ env: { PUSH_WEBHOOK_SECRET: SECRET } }));
vi.mock("@repo/database/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/telegram", () => ({ getDroid: () => getDroid() }));
vi.mock("@/lib/telegram-posts", () => ({
  deliverTelegramPosts: (...args: unknown[]) => deliver(...args),
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { POST } = await import("../app/webhooks/telegram-posts/route");

const request = (body: unknown, secret: string | null = SECRET) =>
  new Request("http://localhost/webhooks/telegram-posts", {
    body: JSON.stringify(body),
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
    method: "POST",
  });

const insert = { record: { id: "x" }, table: "telegram_posts", type: "INSERT" };

describe("POST /webhooks/telegram-posts", () => {
  beforeEach(() => {
    deliver.mockReset();
    getDroid.mockReset();
  });

  test("needs the webhook secret", async () => {
    expect((await POST(request(insert, null))).status).toBe(401);
    expect((await POST(request(insert, "wrong"))).status).toBe(401);
  });

  test("takes only inserts into telegram_posts", async () => {
    const response = await POST(request({ ...insert, table: "orders" }));
    expect(response.status).toBe(400);
  });

  test("skips quietly while the bot isn't set up", async () => {
    getDroid.mockReturnValue(undefined);
    const response = await POST(request(insert));
    expect(await response.json()).toMatchObject({
      skipped: "telegram_not_configured",
    });
    expect(deliver).not.toHaveBeenCalled();
  });

  test("delivers the queue", async () => {
    getDroid.mockReturnValue(Promise.resolve({ api: {} }));
    deliver.mockResolvedValue({ failed: 0, sent: 2 });
    const response = await POST(request(insert));
    expect(await response.json()).toEqual({ failed: 0, ok: true, sent: 2 });
  });
});
