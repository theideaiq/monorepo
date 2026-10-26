import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fakeSupabase, renderWithApp } from "./render";

const track = vi.fn();
const identify = vi.fn();
vi.mock("@repo/analytics/client", () => ({ identify, track }));

const { PassSignIn } = await import("@/components/pass/pass-sign-in");

// The email link lands on the app's sign-in callback page.
const CALLBACK = /\/auth\/callback$/;
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
      : {
          data: {
            user: { created_at: new Date().toISOString(), id: "user-1" },
          },
          error: null,
        }
  );
  const supabase = fakeSupabase();
  Object.assign(supabase.auth, { signInWithOtp, verifyOtp });
  return { signInWithOtp, supabase, verifyOtp };
};

describe("The IDEA Pass email sign-in", () => {
  test("checks the address before sending a code", async () => {
    const { signInWithOtp, supabase } = setup();
    renderWithApp(<PassSignIn returnTo={null} />, {
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

  test("one code signs in or creates the Pass, then goes back", async () => {
    const { signInWithOtp, supabase, verifyOtp } = setup();
    renderWithApp(<PassSignIn returnTo="/cart" />, {
      locale: "en",
      supabase,
    });

    // No name to fill in: onboarding asks for it afterwards.
    expect(screen.queryByLabelText("Full name")).toBeNull();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: " Sara@Example.com " },
    });
    fireEvent.click(screen.getByRole("button", { name: CONTINUE }));

    expect(
      await screen.findByText("We emailed an 8-digit code to sara@example.com.")
    ).toBeTruthy();
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "sara@example.com",
      options: {
        captchaToken: undefined,
        data: { full_name: undefined, locale: "en" },
        emailRedirectTo: expect.stringMatching(CALLBACK),
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
      target: { value: "12345678" },
    });

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/cart"));
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "sara@example.com",
      token: "12345678",
      type: "email",
    });
    expect(identify).toHaveBeenCalledWith("user-1");
    // The user row is just created: a new Pass.
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
    renderWithApp(<PassSignIn returnTo={null} />, {
      locale: "ar",
      supabase,
    });

    fireEvent.change(screen.getByLabelText("البريد الإلكتروني"), {
      target: { value: "sara@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "متابعة" }));
    fireEvent.change(await screen.findByLabelText("رمز التحقق"), {
      target: { value: "00000000" },
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
