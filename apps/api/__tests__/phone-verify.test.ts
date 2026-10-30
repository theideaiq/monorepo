import { describe, expect, test, vi } from "vitest";
import {
  type CheckResult,
  checkVerification,
  type StartResult,
  startVerification,
  type VerifyConfig,
} from "../lib/phone-verify/client";
import {
  handlePhoneCheck,
  handlePhoneStart,
  type PhoneDeps,
} from "../lib/phone-verify/handler";

const PHONE = "+9647701234567";
const USER = "00000000-0000-0000-0000-000000000001";

/** A fake transport: records form bodies and answers from a queue. */
const fakeFetch = (responses: Response[]) => {
  const calls: { form: URLSearchParams; url: string }[] = [];
  const fetch = vi.fn((url: string, init: RequestInit) => {
    calls.push({ form: init.body as URLSearchParams, url });
    return Promise.resolve(responses.shift() ?? Response.json({}));
  });
  return { calls, fetch: fetch as unknown as typeof globalThis.fetch };
};

const config = (fetch: typeof globalThis.fetch): VerifyConfig => ({
  accountSid: "AC00000000000000000000000000000000",
  authToken: "secret-token-0000",
  fetch,
  serviceSid: "VA00000000000000000000000000000000",
});

describe("Twilio Verify client", () => {
  test("sends on WhatsApp first", async () => {
    const { calls, fetch } = fakeFetch([Response.json({ status: "pending" })]);
    expect(await startVerification(config(fetch), PHONE, "ar")).toEqual({
      channel: "whatsapp",
      status: "sent",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://verify.twilio.com/v2/Services/VA00000000000000000000000000000000/Verifications"
    );
    expect(calls[0]?.form.get("Channel")).toBe("whatsapp");
    expect(calls[0]?.form.get("To")).toBe(PHONE);
    expect(calls[0]?.form.get("Locale")).toBe("ar");
  });

  test("falls back to SMS when WhatsApp can't deliver", async () => {
    const { calls, fetch } = fakeFetch([
      Response.json({ code: 60_410 }, { status: 400 }),
      Response.json({ status: "pending" }),
    ]);
    expect(await startVerification(config(fetch), PHONE, "en")).toEqual({
      channel: "sms",
      status: "sent",
    });
    expect(calls[1]?.form.get("Channel")).toBe("sms");
  });

  test("sends by SMS when the person chose SMS", async () => {
    const { calls, fetch } = fakeFetch([Response.json({ status: "pending" })]);
    expect(await startVerification(config(fetch), PHONE, "en", "sms")).toEqual({
      channel: "sms",
      status: "sent",
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.form.get("Channel")).toBe("sms");
  });

  test("stops at Twilio's limits", async () => {
    const { calls, fetch } = fakeFetch([
      Response.json({ code: 60_203 }, { status: 429 }),
    ]);
    expect(await startVerification(config(fetch), PHONE, "en")).toEqual({
      status: "too_many",
    });
    expect(calls).toHaveLength(1);
  });

  test.each([
    [{ status: "approved" }, 200, "approved"],
    [{ status: "pending" }, 200, "wrong_code"],
    [{ code: 20_404 }, 404, "expired"],
    [{ code: 60_202 }, 429, "too_many"],
    [{}, 500, "failed"],
  ] as const)(
    "checks a code: %o (%i) is %s",
    async (body, status, expected) => {
      const { fetch } = fakeFetch([Response.json(body, { status })]);
      expect(await checkVerification(config(fetch), PHONE, "123456")).toBe(
        expected
      );
    }
  );

  test("refuses a code that isn't digits without calling Twilio", async () => {
    const { calls, fetch } = fakeFetch([]);
    expect(await checkVerification(config(fetch), PHONE, "12ab")).toBe(
      "wrong_code"
    );
    expect(calls).toHaveLength(0);
  });
});

const post = (body: unknown) =>
  new Request("https://api.example.iq/account/phone/start", {
    body: JSON.stringify(body),
    method: "POST",
  });

const deps = (overrides: Partial<PhoneDeps> = {}): PhoneDeps => ({
  logError: vi.fn(),
  save: vi.fn(() => Promise.resolve()),
  verify: {
    check: vi.fn((): Promise<CheckResult> => Promise.resolve("approved")),
    start: vi.fn(
      (): Promise<StartResult> =>
        Promise.resolve({ channel: "whatsapp", status: "sent" })
    ),
  },
  ...overrides,
});

describe("phone endpoints", () => {
  test("say so while Twilio isn't configured", async () => {
    const result = await handlePhoneStart(
      post({ phone: PHONE }),
      USER,
      deps({ verify: undefined })
    );
    expect(result).toEqual({
      body: { error: "not_configured", ok: false },
      status: 503,
    });
  });

  test("normalize the number before sending", async () => {
    const d = deps();
    const result = await handlePhoneStart(
      post({ locale: "en", phone: "0770 123 4567" }),
      USER,
      d
    );
    expect(result).toEqual({
      body: { channel: "whatsapp", ok: true, phone: PHONE },
      status: 200,
    });
    expect(d.verify?.start).toHaveBeenCalledWith(PHONE, "en", undefined);
  });

  test("pass on where the person wants the code", async () => {
    const d = deps();
    await handlePhoneStart(
      post({ channel: "sms", locale: "ar", phone: "0770 123 4567" }),
      USER,
      d
    );
    expect(d.verify?.start).toHaveBeenCalledWith(PHONE, "ar", "sms");
  });

  test("refuse numbers that aren't valid", async () => {
    const result = await handlePhoneStart(post({ phone: "123" }), USER, deps());
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ error: "invalid_phone", ok: false });
  });

  test("send codes to Iraqi mobiles only", async () => {
    const d = deps();
    const result = await handlePhoneStart(
      post({ phone: "+962791234567" }),
      USER,
      d
    );
    expect(result).toEqual({
      body: { error: "not_iraqi", ok: false },
      status: 400,
    });
    expect(d.verify?.start).not.toHaveBeenCalled();
  });

  test("apply our own limit per Pass", async () => {
    const limit = vi.fn(() => Promise.resolve(false));
    const result = await handlePhoneStart(
      post({ phone: PHONE }),
      USER,
      deps({ limit })
    );
    expect(result.status).toBe(429);
    expect(limit).toHaveBeenCalledWith(`phone-start:${USER}`);
  });

  test("save the number once the code is approved", async () => {
    const d = deps();
    const result = await handlePhoneCheck(
      post({ code: " 123456 ", phone: PHONE }),
      USER,
      d
    );
    expect(result).toEqual({ body: { ok: true, phone: PHONE }, status: 200 });
    expect(d.verify?.check).toHaveBeenCalledWith(PHONE, "123456");
    expect(d.save).toHaveBeenCalledWith(USER, PHONE);
  });

  test("save nothing for a wrong code", async () => {
    const d = deps({
      verify: {
        check: () => Promise.resolve("wrong_code"),
        start: () => Promise.resolve({ status: "failed" }),
      },
    });
    const result = await handlePhoneCheck(
      post({ code: "000000", phone: PHONE }),
      USER,
      d
    );
    expect(result).toEqual({
      body: { error: "wrong_code", ok: false },
      status: 400,
    });
    expect(d.save).not.toHaveBeenCalled();
  });

  test("log and hide failures", async () => {
    const d = deps({
      verify: {
        check: () => Promise.reject(new Error("network")),
        start: () => Promise.reject(new Error("network")),
      },
    });
    const result = await handlePhoneCheck(
      post({ code: "123456", phone: PHONE }),
      USER,
      d
    );
    expect(result.body).toEqual({ error: "unavailable", ok: false });
    expect(d.logError).toHaveBeenCalled();
  });
});
