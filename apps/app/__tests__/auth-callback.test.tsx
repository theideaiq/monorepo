import { screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { fakeSupabase, renderWithApp } from "./render";

const replace = vi.fn();
vi.mock("@repo/internationalization/navigation", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("@repo/internationalization/navigation")
  >()),
  useRouter: () => ({ replace }),
}));

const { AuthCallback } = await import("@/components/auth/auth-callback");

describe("sign-in link landing page", () => {
  test("goes home once the client has a session, without a second exchange", async () => {
    const supabase = fakeSupabase();
    const exchangeCodeForSession = vi.fn();
    Object.assign(supabase.auth, {
      exchangeCodeForSession,
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: "user-1" } } },
      })),
    });
    renderWithApp(<AuthCallback />, { locale: "en", supabase });

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/pass"));
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  test("offers to sign in again when the link didn't work", async () => {
    renderWithApp(<AuthCallback />, { locale: "en", supabase: fakeSupabase() });

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("/sign-in");
  });
});
