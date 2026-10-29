import { screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { RentCard } from "@/components/store/rent-card";
import { toCheckoutError } from "@/lib/errors";
import { rentPath } from "@/lib/rent";
import { fakeSupabase, renderWithApp } from "./render";

vi.mock("@repo/internationalization/navigation", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
}));

const RENT_PRICE = /9,750 IQD for 7 days/;
const DEPOSIT = /Deposit 29,750 IQD/;
const LATE = /after 14 days late/;
const AR_DAYS = /لمدة 7 أيام/;
const AR_LATE = /بعد 14 يومًا من التأخير/;

/** rental_quote() answering with one rate (or none). */
const quoting = (row: Record<string, number> | null) =>
  fakeSupabase({
    rpc: vi.fn(() => ({
      maybeSingle: async () => ({ data: row, error: null }),
    })),
  });

const GAME = { days: 7, deposit: 29_750, late_fee: 1750, price: 9750 };

describe("single-item rent", () => {
  test("the rent link keeps the chosen version", () => {
    expect(rentPath("mario-kart-8-deluxe")).toBe("/rent/mario-kart-8-deluxe");
    expect(rentPath("abbey-road", "vinyl")).toBe(
      "/rent/abbey-road?variant=vinyl"
    );
  });

  test("checkout says when every copy is rented out", () => {
    expect(
      toCheckoutError({ code: "23514", message: "All copies are rented out" })
    ).toBe("rentedOut");
  });

  test("the product page shows the rent, deposit and late fee", async () => {
    renderWithApp(
      <RentCard available={2} productId="p1" slug="mario" variantId={null} />,
      { locale: "en", supabase: quoting(GAME) }
    );
    expect(await screen.findByText("Rent it on its own")).toBeTruthy();
    expect(screen.getByText(RENT_PRICE)).toBeTruthy();
    expect(screen.getByText(DEPOSIT)).toBeTruthy();
    expect(screen.getByText(LATE)).toBeTruthy();
    // Renting puts it in the cart, with everything else.
    expect(screen.getByRole("button", { name: "Rent it" })).toBeTruthy();
  });

  test("Arabic counts the days in the right form", async () => {
    renderWithApp(
      <RentCard available={0} productId="p1" slug="mario" variantId={null} />,
      { locale: "ar", supabase: quoting(GAME) }
    );
    expect(await screen.findByText(AR_DAYS)).toBeTruthy();
    expect(screen.getByText(AR_LATE)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "كل النسخ مؤجّرة حاليًا."
    );
  });

  test("nothing shows for items not rented on their own", () => {
    const { container } = renderWithApp(
      <RentCard available={2} productId="p1" slug="mario" variantId={null} />,
      { locale: "en", supabase: quoting(null) }
    );
    expect(container.textContent).toBe("");
  });
});
