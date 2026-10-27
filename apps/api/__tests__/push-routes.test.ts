import { beforeEach, describe, expect, test, vi } from "vitest";

const SECRET = "s".repeat(64);
const CRON = "c".repeat(64);
const deliver = vi.fn();
const getPushSender = vi.fn();
const deliverWhatsApp = vi.fn();
const getWhatsAppSender = vi.fn();
const authenticateRequest = vi.fn();
const getDroid = vi.fn();
const deliverTelegram = vi.fn();

vi.mock("@/env", () => ({
  env: {
    CRON_SECRET: CRON,
    NEXT_PUBLIC_APP_URL: "https://partners.theideaiq.com",
    NEXT_PUBLIC_WEB_URL: "https://theideaiq.com",
    PUSH_WEBHOOK_SECRET: SECRET,
  },
}));
vi.mock("@/lib/push", () => ({ getPushSender: () => getPushSender() }));
vi.mock("@/lib/push/deliver", () => ({
  deliverPushNotifications: (...args: unknown[]) => deliver(...args),
}));
vi.mock("@/lib/whatsapp", () => ({
  getWhatsAppSender: () => getWhatsAppSender(),
  whatsappFallbackLanguage: () => "ar",
}));
vi.mock("@/lib/whatsapp/deliver", () => ({
  deliverWhatsAppNotifications: (...args: unknown[]) =>
    deliverWhatsApp(...args),
}));
vi.mock("@/lib/telegram", () => ({ getDroid: () => getDroid() }));
vi.mock("@/lib/telegram-notify", () => ({
  deliverTelegramNotifications: (...args: unknown[]) =>
    deliverTelegram(...args),
}));
vi.mock("@repo/auth/verify", () => ({
  authenticateRequest: (request: Request) => authenticateRequest(request),
}));
vi.mock("@repo/database/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const webhook = await import("../app/webhooks/notifications/route");
const cron = await import("../app/cron/push/route");
const register = await import("../app/push/register/route");
const unregister = await import("../app/push/unregister/route");

const ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const TOKEN = "fcm-token-0000000000000000";
const SUMMARY = { failed: 0, notifications: 1, removed: 0, sent: 2 };
const WHATSAPP_SUMMARY = { failed: 0, notifications: 1, sent: 1, skipped: 0 };
const TELEGRAM_SUMMARY = { blocked: 0, failed: 0, sent: 1 };

const post = (path: string, body: unknown, authorization?: string) =>
  new Request(`https://api.theideaiq.com${path}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "https://partners.theideaiq.com",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    method: "POST",
  });

const insert = { record: { id: ID }, table: "notifications", type: "INSERT" };

beforeEach(() => {
  vi.clearAllMocks();
  getPushSender.mockReturnValue({ send: vi.fn() });
  deliver.mockResolvedValue(SUMMARY);
  getWhatsAppSender.mockReturnValue(null);
  deliverWhatsApp.mockResolvedValue(WHATSAPP_SUMMARY);
  getDroid.mockReturnValue(undefined);
  deliverTelegram.mockResolvedValue(TELEGRAM_SUMMARY);
});

describe("POST /webhooks/notifications", () => {
  test("rejects requests without the webhook secret", async () => {
    const wrong = post("/webhooks/notifications", insert, "Bearer nope");
    const none = post("/webhooks/notifications", insert);
    expect((await webhook.POST(wrong)).status).toBe(401);
    expect((await webhook.POST(none)).status).toBe(401);
    expect(deliver).not.toHaveBeenCalled();
  });

  test("rejects anything but a notifications insert", async () => {
    const update = { ...insert, type: "UPDATE" };
    const response = await webhook.POST(
      post("/webhooks/notifications", update, `Bearer ${SECRET}`)
    );
    expect(response.status).toBe(400);
  });

  test("pushes the inserted notification", async () => {
    const response = await webhook.POST(
      post("/webhooks/notifications", insert, `Bearer ${SECRET}`)
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, ...SUMMARY });
    expect(deliver).toHaveBeenCalledWith({}, expect.anything(), [ID]);
  });

  test("skips while FCM is not configured", async () => {
    getPushSender.mockReturnValue(null);
    const response = await webhook.POST(
      post("/webhooks/notifications", insert, `Bearer ${SECRET}`)
    );
    expect(await response.json()).toEqual({
      ok: true,
      skipped: "push_not_configured",
    });
    expect(deliver).not.toHaveBeenCalled();
  });

  test("answers 500 when delivery fails", async () => {
    deliver.mockRejectedValue(new Error("db down"));
    const response = await webhook.POST(
      post("/webhooks/notifications", insert, `Bearer ${SECRET}`)
    );
    expect(response.status).toBe(500);
  });

  test("also sends WhatsApp messages when WhatsApp is configured", async () => {
    getWhatsAppSender.mockReturnValue({ send: vi.fn() });
    const response = await webhook.POST(
      post("/webhooks/notifications", insert, `Bearer ${SECRET}`)
    );
    expect(await response.json()).toEqual({
      ok: true,
      ...SUMMARY,
      whatsapp: WHATSAPP_SUMMARY,
    });
    expect(deliverWhatsApp).toHaveBeenCalledWith({}, expect.anything(), {
      fallbackLanguage: "ar",
      ids: [ID],
    });
  });

  test("also sends the notification on Telegram when Droid is set up", async () => {
    const bot = { api: {} };
    getDroid.mockReturnValue(Promise.resolve(bot));
    const response = await webhook.POST(
      post("/webhooks/notifications", insert, `Bearer ${SECRET}`)
    );
    expect(await response.json()).toEqual({
      ok: true,
      ...SUMMARY,
      telegram: TELEGRAM_SUMMARY,
    });
    expect(deliverTelegram).toHaveBeenCalledWith({}, bot, [ID]);
  });

  test("sends WhatsApp messages without push", async () => {
    getPushSender.mockReturnValue(null);
    getWhatsAppSender.mockReturnValue({ send: vi.fn() });
    const response = await webhook.POST(
      post("/webhooks/notifications", insert, `Bearer ${SECRET}`)
    );
    expect(await response.json()).toEqual({
      ok: true,
      skipped: "push_not_configured",
      whatsapp: WHATSAPP_SUMMARY,
    });
    expect(deliver).not.toHaveBeenCalled();
  });

  test("a WhatsApp failure answers 500 after pushing", async () => {
    getWhatsAppSender.mockReturnValue({ send: vi.fn() });
    deliverWhatsApp.mockRejectedValue(new Error("graph down"));
    const response = await webhook.POST(
      post("/webhooks/notifications", insert, `Bearer ${SECRET}`)
    );
    expect(response.status).toBe(500);
    expect(deliver).toHaveBeenCalled();
  });
});

describe("GET /cron/push", () => {
  const get = (authorization?: string) =>
    new Request("https://api.theideaiq.com/cron/push", {
      headers: authorization ? { Authorization: authorization } : {},
    });

  test("needs the cron secret", async () => {
    expect((await cron.GET(get())).status).toBe(401);
    expect(deliver).not.toHaveBeenCalled();
  });

  test("sweeps unpushed notifications", async () => {
    const response = await cron.GET(get(`Bearer ${CRON}`));
    expect(await response.json()).toEqual({ ok: true, ...SUMMARY });
    expect(deliver).toHaveBeenCalledWith({}, expect.anything());
  });

  test("sweeps unsent WhatsApp messages too", async () => {
    getWhatsAppSender.mockReturnValue({ send: vi.fn() });
    const response = await cron.GET(get(`Bearer ${CRON}`));
    expect(await response.json()).toEqual({
      ok: true,
      ...SUMMARY,
      whatsapp: WHATSAPP_SUMMARY,
    });
    expect(deliverWhatsApp).toHaveBeenCalledWith({}, expect.anything(), {
      fallbackLanguage: "ar",
    });
  });
});

describe("POST /push/register and /push/unregister", () => {
  const rpc = vi.fn();
  const eq = vi.fn();

  beforeEach(() => {
    rpc.mockResolvedValue({ error: null });
    eq.mockResolvedValue({ error: null });
    authenticateRequest.mockResolvedValue({
      supabase: { from: () => ({ delete: () => ({ eq }) }), rpc },
      userId: "u",
    });
  });

  test("needs a signed-in user", async () => {
    authenticateRequest.mockResolvedValue(null);
    const response = await register.POST(
      post("/push/register", { platform: "ios", token: TOKEN })
    );
    expect(response.status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  test("validates the body", async () => {
    const response = await register.POST(
      post("/push/register", { platform: "web", token: TOKEN })
    );
    expect(response.status).toBe(400);
  });

  test("registers the device as the caller, with CORS for The IDEA Partners", async () => {
    const response = await register.POST(
      post("/push/register", { platform: "android", token: TOKEN })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://partners.theideaiq.com"
    );
    expect(rpc).toHaveBeenCalledWith("register_push_device", {
      device_platform: "android",
      device_token: TOKEN,
    });
  });

  test("reports a registration failure", async () => {
    rpc.mockResolvedValue({ error: { message: "nope" } });
    const response = await register.POST(
      post("/push/register", { platform: "ios", token: TOKEN })
    );
    expect(response.status).toBe(500);
  });

  test("removes the caller's device", async () => {
    const response = await unregister.POST(
      post("/push/unregister", { token: TOKEN })
    );
    expect(response.status).toBe(200);
    expect(eq).toHaveBeenCalledWith("token", TOKEN);
    expect(
      (await unregister.POST(post("/push/unregister", { token: "x" }))).status
    ).toBe(400);
  });
});
