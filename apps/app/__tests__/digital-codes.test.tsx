import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { OrderCodes } from "@/components/store/digital-codes";
import { byPlatform, codeName, type DigitalBrand } from "@/lib/digital-codes";
import { fakeDb } from "./fake-db";
import { renderWithApp } from "./render";

const brand = (row: Partial<DigitalBrand>): DigitalBrand => ({
  id: "b1",
  kind: "gaming",
  name_ar: "بلايستيشن",
  name_en: "PlayStation",
  platform: "playstation",
  products: [],
  redeem_ar: null,
  redeem_en: null,
  region: "US",
  region_ar: "المتجر الأمريكي",
  region_en: "US store",
  slug: "playstation-us",
  ...row,
});

describe("digital codes", () => {
  test("a code names its store region and face value", () => {
    const product = { face_currency: "USD", face_value: 20 };
    expect(codeName(brand({}), product, "en")).toBe(
      "PlayStation · US store · USD 20"
    );
    expect(codeName(brand({}), product, "ar")).toBe(
      "بلايستيشن · المتجر الأمريكي · USD 20"
    );
  });

  test("brands are grouped by the platform their codes work on", () => {
    const { other, platforms } = byPlatform([
      brand({ id: "us" }),
      brand({ id: "ae", region: "AE" }),
      brand({ id: "shahid", platform: null }),
    ]);
    expect(platforms.get("playstation")?.map((item) => item.id)).toEqual([
      "us",
      "ae",
    ]);
    expect(other.map((item) => item.id)).toEqual(["shahid"]);
  });

  test("a delivered code is revealed with a tap", async () => {
    const db = fakeDb({
      results: {
        "digital_codes.select": {
          data: [
            {
              delivered_at: "2026-10-30T10:00:00Z",
              id: "c1",
              order_item_id: "i1",
              revealed_at: null,
              status: "delivered",
            },
            {
              delivered_at: null,
              id: "c2",
              order_item_id: "i1",
              revealed_at: null,
              status: "held",
            },
          ],
          error: null,
        },
      },
      rpcs: {
        reveal_digital_code: {
          data: [{ code: "ABCD-EFGH", pin: "1234", serial: null }],
          error: null,
        },
      },
    });
    renderWithApp(
      <OrderCodes
        hasCodes
        names={new Map([["i1", "PlayStation · US store · USD 20"]])}
        orderId="o1"
      />,
      { locale: "en", supabase: db.supabase }
    );
    expect(
      await screen.findByText("We're checking this order. It won't be long.")
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reveal code" }));
    expect(await screen.findByText("ABCD-EFGH")).toBeTruthy();
    expect(screen.getByText("1234")).toBeTruthy();
    await waitFor(() =>
      expect(db.rpcCalls).toContainEqual({
        args: { target: "c1" },
        name: "reveal_digital_code",
      })
    );
  });
});
