import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { SignInRoute } from "@/components/auth/sign-in-route";
import { goToPass, usesPass } from "@/lib/pass";
import { renderWithApp } from "./render";
import { searchParams } from "./setup";

vi.mock("@/lib/pass", () => ({ goToPass: vi.fn(), usesPass: vi.fn() }));

describe("sign-in route", () => {
  afterEach(() => vi.clearAllMocks());

  test("on the web, hands over to The IDEA Pass with the way back", async () => {
    vi.mocked(usesPass).mockReturnValue(true);
    searchParams.current = new URLSearchParams({ next: "/cart" });
    renderWithApp(<SignInRoute mode="sign-up" />);

    await waitFor(() =>
      expect(goToPass).toHaveBeenCalledWith("/sign-up", "ar", "/cart")
    );
    expect(screen.queryByLabelText("رقم الهاتف المحمول")).toBeNull();
  });

  test("in the iOS/Android apps, signs in right here", async () => {
    vi.mocked(usesPass).mockReturnValue(false);
    renderWithApp(<SignInRoute mode="sign-in" />);

    expect(await screen.findByLabelText("رقم الهاتف المحمول")).toBeDefined();
    expect(goToPass).not.toHaveBeenCalled();
  });
});
