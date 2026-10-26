import { describe, expect, test, vi } from "vitest";
import { type ContactDeps, clientIp, handleContact } from "../lib/contact";

const WEB = "https://theideaiq.com";

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://business.theideaiq.com",
    NEXT_PUBLIC_WEB_URL: WEB,
    RESEND_FROM: undefined,
  },
}));
vi.mock("@repo/observability/log", () => ({
  log: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
// The route's integrations as they are without their keys.
vi.mock("@repo/email", () => ({ resend: undefined, sendEmail: vi.fn() }));
vi.mock("@repo/rate-limit", () => ({
  createRateLimiter: vi.fn(),
  slidingWindow: vi.fn(),
}));
vi.mock("@repo/security/form", () => ({
  protectForm: vi.fn(() => Promise.resolve("ok")),
}));

const VALID = {
  email: " Sara@Example.com ",
  message: "Do you ship to Erbil?",
  name: "Sara",
  topic: "store",
};

const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/contact", {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
    method: "POST",
  });

const deps = (overrides: Partial<ContactDeps> = {}): ContactDeps => ({
  inbox: "hello@theideaiq.com",
  logError: vi.fn(),
  protect: vi.fn(() => Promise.resolve("ok" as const)),
  render: vi.fn(() => ({}) as never),
  send: vi.fn(() => Promise.resolve()),
  ...overrides,
});

describe("handleContact", () => {
  test("emails the team with Reply-To set to the visitor", async () => {
    const d = deps();
    const result = await handleContact(request(VALID), d);
    expect(result).toEqual({ body: { ok: true }, status: 200 });
    expect(d.protect).toHaveBeenCalledWith(
      expect.any(Request),
      "sara@example.com"
    );
    expect(d.render).toHaveBeenCalledWith({
      email: "sara@example.com",
      message: "Do you ship to Erbil?",
      name: "Sara",
    });
    expect(d.send).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "sara@example.com",
        subject: "Contact form (store): Sara",
        to: "hello@theideaiq.com",
      })
    );
  });

  test("names the invalid fields", async () => {
    const d = deps();
    const result = await handleContact(
      request({ email: "nope", message: " ", name: "" }),
      d
    );
    expect(result.status).toBe(400);
    expect(result.body).toEqual({
      error: "invalid",
      fields: ["email", "message", "name"],
      ok: false,
    });
    expect(d.send).not.toHaveBeenCalled();
  });

  test("rejects a body that isn't JSON", async () => {
    const result = await handleContact(request("{"), deps());
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: "invalid", ok: false });
  });

  test("answers ok to a filled honeypot without sending", async () => {
    const d = deps();
    const result = await handleContact(
      request({ ...VALID, website: "https://spam.example" }),
      d
    );
    expect(result.status).toBe(200);
    expect(d.protect).not.toHaveBeenCalled();
    expect(d.send).not.toHaveBeenCalled();
  });

  test("is unavailable without email configured", async () => {
    const result = await handleContact(
      request(VALID),
      deps({ send: undefined })
    );
    expect(result).toEqual({
      body: { error: "unavailable", ok: false },
      status: 503,
    });
  });

  test.each([
    ["rate_limited", 429, { error: "rate_limited", ok: false }],
    ["bot", 403, { error: "forbidden", ok: false }],
    ["invalid_email", 400, { error: "invalid", fields: ["email"], ok: false }],
  ] as const)(
    "maps the form guard's %s verdict",
    async (verdict, status, body) => {
      const d = deps({ protect: vi.fn(() => Promise.resolve(verdict)) });
      const result = await handleContact(request(VALID), d);
      expect(result).toEqual({ body, status });
      expect(d.send).not.toHaveBeenCalled();
    }
  );

  test("allows one message per address per day", async () => {
    const limit = vi.fn(() => Promise.resolve(false));
    const d = deps({ limit });
    const result = await handleContact(
      request(VALID, { "x-forwarded-for": "203.0.113.7, 10.0.0.1" }),
      d
    );
    expect(result.status).toBe(429);
    expect(limit).toHaveBeenCalledWith("contact_form_203.0.113.7");
    expect(d.send).not.toHaveBeenCalled();
  });

  test("logs a failed send and answers with a code", async () => {
    const d = deps({ send: vi.fn(() => Promise.reject(new Error("boom"))) });
    const result = await handleContact(request(VALID), d);
    expect(result).toEqual({
      body: { error: "unknown", ok: false },
      status: 502,
    });
    expect(d.logError).toHaveBeenCalled();
  });
});

describe("clientIp", () => {
  test("prefers x-real-ip, then the first x-forwarded-for hop", () => {
    const req = (headers: Record<string, string>) =>
      new Request("http://localhost", { headers });
    expect(clientIp(req({ "x-real-ip": "198.51.100.1" }))).toBe("198.51.100.1");
    expect(clientIp(req({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe(
      "198.51.100.2"
    );
    expect(clientIp(req({}))).toBe("unknown");
  });
});

describe("POST /contact", () => {
  test("allows only the website's origin and is unavailable without Resend", async () => {
    const { OPTIONS, POST } = await import("../app/contact/route");

    const fromWeb = await OPTIONS(
      new Request("http://localhost/contact", {
        headers: { origin: WEB },
        method: "OPTIONS",
      })
    );
    expect(fromWeb.status).toBe(204);
    expect(fromWeb.headers.get("access-control-allow-origin")).toBe(WEB);

    const fromApp = await OPTIONS(
      new Request("http://localhost/contact", {
        headers: { origin: "https://business.theideaiq.com" },
        method: "OPTIONS",
      })
    );
    expect(fromApp.headers.get("access-control-allow-origin")).toBeNull();

    const response = await POST(request(VALID, { origin: WEB }));
    expect(response.headers.get("access-control-allow-origin")).toBe(WEB);
    // The test environment has no RESEND_TOKEN.
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "unavailable", ok: false });
  });
});
