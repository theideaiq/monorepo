import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fakeSupabase, renderWithApp } from "./render";

const track = vi.fn();
const identify = vi.fn();
vi.mock("@repo/analytics/client", () => ({ identify, track }));

const { PassSignIn } = await import("@/components/pass/pass-sign-in");

const CONTINUE = /^Continue$/;
const RESEND_IN = /^Resend code in/;
const assign = vi.fn();
const originalLocation = window.location;
// input-otp checks for password-manager badges; jsdom has no layout.
document.elementFromPoint ??= () => null;

beforeEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, assign },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: originalLocation,
  });
  assign.mockClear();
  track.mockClear();
  identify.mockClear();
});

const setup = ({
  sendError = null,
  verifyError = null,
}: {
  sendError?: { code: string; message: string; status: number } | null;
  verifyError?: { code: string; message: string; status: number } | null;
} = {}) => {
  const signInWithOtp = vi.fn(async () => ({ data: {}, error: sendError }));
  const verifyOtp = vi.fn(async () =>
    verifyError
      ? { data: { user: null }, error: verifyError }
      : { data: { user: { id: "user-1" } }, error: null }
  );
  const supabase = fakeSupabase();
  Object.assign(supabase.auth, { signInWithOtp, verifyOtp });
  return { signInWithOtp, supabase, verifyOtp };
};

describe("The IDEA Pass email sign-in", () => {
  test("checks the address before sending a code", async () => {
    const { signInWithOtp, supabase } = setup();
    renderWithApp(<PassSignIn mode="sign-in" returnTo={null} />, {
      locale: "en",
      supabase,
    });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: CONTINUE }));

    expect(
      await screen.findByText(
        "Enter a valid email address, e.g. name@example.com."
      )
    ).toBeTruthy();
    expect(screen.getByLabelText("Email").getAttribute("aria-invalid")).toBe(
      "true"
    );
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  test("signs in existing accounts only and offers sign-up otherwise", async () => {
    const { signInWithOtp, supabase } = setup({
      sendError: {
        code: "otp_disabled",
        message: "Signups not allowed for otp",
        status: 422,
      },
    });
    renderWithApp(<PassSignIn mode="sign-in" returnTo="/en/cart" />, {
      locale: "en",
      supabase,
    });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: " Sara@Example.com " },
    });
    fireEvent.click(screen.getByRole("button", { name: CONTINUE }));

    expect(
      await screen.findByText("There's no account with this email yet.")
    ).toBeTruthy();
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "sara@example.com",
      options: {
        captchaToken: undefined,
        data: { full_name: undefined, locale: "en" },
        shouldCreateUser: false,
      },
    });
    const signUp = screen.getByRole("link", {
      name: "Get The IDEA Pass with this email",
    });
    expect(signUp.getAttribute("href")).toBe(
      `/en/sign-up?return_to=${encodeURIComponent("/en/cart")}`
    );
  });

  test("signs up with a name and the emailed code", async () => {
    const { signInWithOtp, supabase, verifyOtp } = setup();
    renderWithApp(<PassSignIn mode="sign-up" returnTo="/en/cart" />, {
      locale: "en",
      supabase,
    });

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "sara@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: CONTINUE }));
    expect(await screen.findByText("Enter your name.")).toBeTruthy();
    expect(signInWithOtp).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Sara Ali" },
    });
    fireEvent.click(screen.getByRole("button", { name: CONTINUE }));

    expect(
      await screen.findByText("We emailed a 6-digit code to sara@example.com.")
    ).toBeTruthy();
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "sara@example.com",
      options: {
        captchaToken: undefined,
        data: { full_name: "Sara Ali", locale: "en" },
        shouldCreateUser: true,
      },
    });
    // Resend waits for the cooldown.
    expect(
      (
        screen.getByRole("button", {
          name: RESEND_IN,
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);

    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123456" },
    });

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/en/cart"));
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "sara@example.com",
      token: "123456",
      type: "email",
    });
    expect(identify).toHaveBeenCalledWith("user-1");
    expect(track).toHaveBeenCalledWith("sign_up", { method: "email" });
  });

  test("a wrong code can be retried, or the address changed", async () => {
    const { supabase } = setup({
      verifyError: {
        code: "otp_expired",
        message: "Token has expired or is invalid",
        status: 403,
      },
    });
    renderWithApp(<PassSignIn mode="sign-in" returnTo={null} />, {
      locale: "ar",
      supabase,
    });

    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
      target: { value: "sara@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "متابعة" }));
    fireEvent.change(await screen.findByLabelText("رمز التحقق"), {
      target: { value: "000000" },
    });

    expect(
      await screen.findByText("الرمز غير صحيح أو منتهي الصلاحية.")
    ).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "استخدام بريد إلكتروني آخر" })
    );
    expect(
      (screen.getByLabelText("البريد الإلكتروني") as HTMLInputElement).value
    ).toBe("sara@example.com");
  });
});
