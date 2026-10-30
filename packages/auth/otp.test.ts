import { describe, expect, test, vi } from "vitest";
import {
  normalizeEmail,
  sendEmailOtp,
  sendPhoneOtp,
  sendPhoneVerification,
  toOtpErrorCode,
  verifyEmailOtp,
  verifyPhoneOtp,
  verifyPhoneVerification,
} from "./otp";

const clientWith = (auth: Record<string, unknown>) =>
  ({ auth }) as unknown as Parameters<typeof sendPhoneOtp>[0];

const authError = (code: string, status: number) =>
  ({ code, message: code, name: "AuthApiError", status }) as never;

describe("email OTP", () => {
  test("normalizes addresses", () => {
    expect(normalizeEmail("  Sara@Example.COM ")).toBe("sara@example.com");
    expect(normalizeEmail("sara@example")).toBeNull();
    expect(normalizeEmail("sara example.com")).toBeNull();
    expect(normalizeEmail(`${"a".repeat(320)}@example.com`)).toBeNull();
  });

  test("rejects invalid addresses without calling Supabase", async () => {
    const signInWithOtp = vi.fn();
    const result = await sendEmailOtp(clientWith({ signInWithOtp }), "sara@");

    expect(result).toMatchObject({ code: "invalid_email", ok: false });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  test("sends the code to the normalized address", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const result = await sendEmailOtp(
      clientWith({ signInWithOtp }),
      " Sara@Example.com",
      { fullName: " Sara ", locale: "ar" }
    );

    expect(result).toEqual({
      email: "sara@example.com",
      ok: true,
      value: undefined,
    });
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "sara@example.com",
      options: {
        captchaToken: undefined,
        data: { full_name: "Sara", locale: "ar" },
        shouldCreateUser: true,
      },
    });
  });

  test("sign-in only: an unknown address has no account", async () => {
    const signInWithOtp = vi
      .fn()
      .mockResolvedValue({ error: authError("otp_disabled", 422) });
    const signIn = await sendEmailOtp(
      clientWith({ signInWithOtp }),
      "new@example.com",
      { shouldCreateUser: false }
    );
    expect(signIn).toMatchObject({ code: "no_account", ok: false });
    expect(signInWithOtp.mock.calls[0]?.[0].options.shouldCreateUser).toBe(
      false
    );

    // With sign-up allowed, the same answer means sign-ups are closed.
    const signUp = await sendEmailOtp(
      clientWith({ signInWithOtp }),
      "new@example.com"
    );
    expect(signUp).toMatchObject({ code: "signups_disabled", ok: false });
  });

  test("maps send errors", async () => {
    const send = async (code: string, status: number) =>
      await sendEmailOtp(
        clientWith({
          signInWithOtp: vi
            .fn()
            .mockResolvedValue({ error: authError(code, status) }),
        }),
        "sara@example.com"
      );

    expect(await send("over_email_send_rate_limit", 429)).toMatchObject({
      code: "rate_limited",
    });
    expect(await send("validation_failed", 400)).toMatchObject({
      code: "invalid_email",
    });
    expect(await send("email_address_invalid", 400)).toMatchObject({
      code: "invalid_email",
    });
    expect(await send("email_provider_disabled", 400)).toMatchObject({
      code: "delivery_failed",
    });
  });

  test("verifies the code and tells a new Pass from a returning one", async () => {
    const now = Date.parse("2026-10-26T12:00:00Z");
    const verifyOtp = vi.fn().mockResolvedValue({
      data: { user: { created_at: "2026-10-26T11:58:00Z", id: "user-1" } },
      error: null,
    });
    const result = await verifyEmailOtp(
      clientWith({ verifyOtp }),
      "sara@example.com",
      "123456",
      { now }
    );

    expect(result).toEqual({
      email: "sara@example.com",
      ok: true,
      value: { isNew: true, userId: "user-1" },
    });

    verifyOtp.mockResolvedValue({
      data: { user: { created_at: "2026-01-02T09:00:00Z", id: "user-1" } },
      error: null,
    });
    expect(
      await verifyEmailOtp(clientWith({ verifyOtp }), "sara@example.com", "1", {
        now,
      })
    ).toMatchObject({ value: { isNew: false } });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "sara@example.com",
      token: "123456",
      type: "email",
    });
  });

  test("tells a wrong code from an expired one", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({
      data: { user: null },
      error: authError("otp_expired", 403),
    });
    const client = clientWith({ verifyOtp });
    const sentAt = Date.UTC(2026, 9, 24, 12);

    expect(
      await verifyEmailOtp(client, "sara@example.com", "000000", {
        now: sentAt + 60_000,
        sentAt,
      })
    ).toMatchObject({ code: "invalid_code", ok: false });
    expect(
      await verifyEmailOtp(client, "sara@example.com", "000000", {
        now: sentAt + 600_000,
        sentAt,
      })
    ).toMatchObject({ code: "expired_code", ok: false });
    expect(
      await verifyEmailOtp(client, "sara@example.com", "000000")
    ).toMatchObject({ code: "invalid_code", ok: false });
  });

  test("a verification without a user fails", async () => {
    const verifyOtp = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: null });
    expect(
      await verifyEmailOtp(clientWith({ verifyOtp }), "a@b.co", "123456")
    ).toMatchObject({ code: "unknown", ok: false });
  });
});

describe("phone OTP (switched off, kept for later)", () => {
  test("maps Supabase error codes", () => {
    expect(
      toOtpErrorCode({ code: "over_sms_send_rate_limit", status: 429 })
    ).toBe("rate_limited");
    expect(toOtpErrorCode({ code: "otp_expired", status: 403 })).toBe(
      "invalid_code"
    );
    expect(toOtpErrorCode({ code: undefined, status: 429 })).toBe(
      "rate_limited"
    );
    expect(toOtpErrorCode({ code: "something_new", status: 500 })).toBe(
      "unknown"
    );
  });

  test("rejects invalid numbers without calling Supabase", async () => {
    const signInWithOtp = vi.fn();
    const result = await sendPhoneOtp(clientWith({ signInWithOtp }), "123");

    expect(result).toMatchObject({ code: "invalid_phone", ok: false });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  test("sends the code to the normalized number", async () => {
    const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
    const result = await sendPhoneOtp(
      clientWith({ signInWithOtp }),
      "٠٧٧٠ ١٢٣ ٤٥٦٧",
      { channel: "whatsapp", fullName: " Sara ", locale: "ar" }
    );

    expect(result).toEqual({
      ok: true,
      phone: "+9647701234567",
      value: undefined,
    });
    expect(signInWithOtp).toHaveBeenCalledWith({
      options: {
        captchaToken: undefined,
        channel: "whatsapp",
        data: { full_name: "Sara", locale: "ar" },
        shouldCreateUser: true,
      },
      phone: "+9647701234567",
    });
  });

  test("verifies the code", async () => {
    const verifyOtp = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const result = await verifyPhoneOtp(
      clientWith({ verifyOtp }),
      "+9647701234567",
      "123456"
    );

    expect(result).toEqual({
      ok: true,
      phone: "+9647701234567",
      value: { userId: "user-1" },
    });
    expect(verifyOtp).toHaveBeenCalledWith({
      phone: "+9647701234567",
      token: "123456",
      type: "sms",
    });
  });
});

describe("phone verification (Supabase phone change)", () => {
  test("sends the code on WhatsApp by default", async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const result = await sendPhoneVerification(
      clientWith({ updateUser }),
      "0770 123 4567"
    );
    expect(updateUser).toHaveBeenCalledWith({
      channel: "whatsapp",
      phone: "+9647701234567",
    });
    expect(result).toEqual({
      ok: true,
      phone: "+9647701234567",
      value: { channel: "whatsapp" },
    });
  });

  test("falls back to SMS when WhatsApp can't deliver", async () => {
    const updateUser = vi
      .fn()
      .mockResolvedValueOnce({ error: authError("sms_send_failed", 500) })
      .mockResolvedValueOnce({ error: null });
    const result = await sendPhoneVerification(
      clientWith({ updateUser }),
      "+9647701234567"
    );
    expect(updateUser).toHaveBeenLastCalledWith({
      channel: "sms",
      phone: "+9647701234567",
    });
    expect(result.ok && result.value.channel).toBe("sms");
  });

  test("a number another Pass holds is taken", async () => {
    const updateUser = vi
      .fn()
      .mockResolvedValue({ error: authError("phone_exists", 422) });
    const result = await sendPhoneVerification(
      clientWith({ updateUser }),
      "+9647701234567",
      { channel: "sms" }
    );
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(result.ok ? null : result.code).toBe("phone_taken");
  });

  test("an invalid number never reaches Supabase", async () => {
    const updateUser = vi.fn();
    const result = await sendPhoneVerification(clientWith({ updateUser }), "1");
    expect(updateUser).not.toHaveBeenCalled();
    expect(result.ok ? null : result.code).toBe("invalid_phone");
  });

  test("checks the code as a phone change", async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    const result = await verifyPhoneVerification(
      clientWith({ verifyOtp }),
      "+9647701234567",
      " 123456 "
    );
    expect(verifyOtp).toHaveBeenCalledWith({
      phone: "+9647701234567",
      token: "123456",
      type: "phone_change",
    });
    expect(result.ok).toBe(true);
  });
});
