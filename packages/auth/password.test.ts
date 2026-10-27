import { describe, expect, test, vi } from "vitest";
import {
  confirmSignUp,
  passwordProblem,
  resetPassword,
  sendPasswordReset,
  setPassword,
  signInWithPassword,
  signUpWithPassword,
  toPasswordErrorCode,
} from "./password";

const clientWith = (auth: Record<string, unknown>) =>
  ({ auth }) as unknown as Parameters<typeof signInWithPassword>[0];

const authError = (code: string, status = 400, reasons?: string[]) =>
  ({ code, message: code, name: "AuthApiError", reasons, status }) as never;

describe("password policy", () => {
  test("at least 8 characters with letters and digits", () => {
    expect(passwordProblem("abc123")).toBe("too_short");
    expect(passwordProblem("abcdefgh")).toBe("letters_digits");
    expect(passwordProblem("12345678")).toBe("letters_digits");
    expect(passwordProblem("baghdad2026")).toBeNull();
    // Arabic letters count as letters.
    expect(passwordProblem("بغداد2026")).toBeNull();
    expect(passwordProblem(`a1${"x".repeat(80)}`)).toBe("too_long");
  });

  test("names Supabase's errors", () => {
    expect(toPasswordErrorCode(authError("invalid_credentials"))).toBe(
      "wrong_password"
    );
    expect(
      toPasswordErrorCode(authError("weak_password", 422, ["pwned"]))
    ).toBe("pwned_password");
    expect(toPasswordErrorCode(authError("weak_password", 422))).toBe(
      "weak_password"
    );
    expect(toPasswordErrorCode(authError("reauthentication_needed"))).toBe(
      "reauthentication_needed"
    );
    expect(toPasswordErrorCode(authError("over_request_rate_limit", 429))).toBe(
      "rate_limited"
    );
  });
});

describe("signing in and up", () => {
  test("signs in with the normalized address and the captcha token", async () => {
    const signInWithPassword_ = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const result = await signInWithPassword(
      clientWith({ signInWithPassword: signInWithPassword_ }),
      " Sara@Example.com ",
      "baghdad2026",
      "tok"
    );
    expect(result).toEqual({
      email: "sara@example.com",
      ok: true,
      value: { userId: "u1" },
    });
    expect(signInWithPassword_).toHaveBeenCalledWith({
      email: "sara@example.com",
      options: { captchaToken: "tok" },
      password: "baghdad2026",
    });
  });

  test("a wrong password reads as such", async () => {
    const result = await signInWithPassword(
      clientWith({
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null },
          error: authError("invalid_credentials"),
        }),
      }),
      "sara@example.com",
      "nope1234"
    );
    expect(result).toMatchObject({ code: "wrong_password", ok: false });
  });

  test("signs up with the name and language, refusing weak passwords first", async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { identities: [{ id: "i" }] } },
      error: null,
    });
    const client = clientWith({ signUp });
    expect(
      await signUpWithPassword(client, "sara@example.com", "short", {
        fullName: "Sara",
      })
    ).toMatchObject({ code: "weak_password", ok: false });
    expect(signUp).not.toHaveBeenCalled();

    const result = await signUpWithPassword(
      client,
      "sara@example.com",
      "baghdad2026",
      { captchaToken: "tok", fullName: " Sara ", locale: "ar" }
    );
    expect(result).toMatchObject({ email: "sara@example.com", ok: true });
    expect(signUp).toHaveBeenCalledWith({
      email: "sara@example.com",
      options: {
        captchaToken: "tok",
        data: { full_name: "Sara", locale: "ar" },
      },
      password: "baghdad2026",
    });
  });

  test("an address that already has a Pass", async () => {
    const result = await signUpWithPassword(
      clientWith({
        signUp: vi.fn().mockResolvedValue({
          data: { user: { identities: [] } },
          error: null,
        }),
      }),
      "sara@example.com",
      "baghdad2026",
      { fullName: "Sara" }
    );
    expect(result).toMatchObject({ code: "already_registered", ok: false });
  });

  test("the sign-up code confirms and signs in", async () => {
    const verifyOtp = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const result = await confirmSignUp(
      clientWith({ verifyOtp }),
      "sara@example.com",
      "12345678"
    );
    expect(result).toMatchObject({ ok: true, value: { userId: "u1" } });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "sara@example.com",
      token: "12345678",
      type: "signup",
    });
  });
});

describe("resetting and changing", () => {
  test("sends the reset code", async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    const result = await sendPasswordReset(
      clientWith({ resetPasswordForEmail }),
      "Sara@example.com",
      "tok"
    );
    expect(result).toMatchObject({ email: "sara@example.com", ok: true });
    expect(resetPasswordForEmail).toHaveBeenCalledWith("sara@example.com", {
      captchaToken: "tok",
    });
  });

  test("the reset code, then the new password", async () => {
    const verifyOtp = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const updateUser = vi
      .fn()
      .mockResolvedValue({ data: { user: { email: "s" } }, error: null });
    const result = await resetPassword(
      clientWith({ updateUser, verifyOtp }),
      "sara@example.com",
      "12345678",
      "baghdad2026"
    );
    expect(result).toMatchObject({ ok: true });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "sara@example.com",
      token: "12345678",
      type: "recovery",
    });
    expect(updateUser).toHaveBeenCalledWith({ password: "baghdad2026" });
  });

  test("a change on an older session asks for a code", async () => {
    const updateUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: authError("reauthentication_needed"),
    });
    const result = await setPassword(clientWith({ updateUser }), "baghdad2026");
    expect(result).toMatchObject({
      code: "reauthentication_needed",
      ok: false,
    });
    await setPassword(clientWith({ updateUser }), "baghdad2026", "123456");
    expect(updateUser).toHaveBeenLastCalledWith({
      nonce: "123456",
      password: "baghdad2026",
    });
  });
});
