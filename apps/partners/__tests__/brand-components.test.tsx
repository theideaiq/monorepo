import { NameTile } from "@repo/design-system/components/brand/name-tile";
import {
  isMarketPriceFresh,
  SouqPrice,
} from "@repo/design-system/components/brand/souq-price";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

const labels = { currency: "IQD", market: "In the market", withUs: "With us" };
const now = new Date("2026-10-24T12:00:00Z");

describe("SouqPrice", () => {
  test("shows a market price checked in the last 7 days", () => {
    render(
      <SouqPrice
        checkedAt="2026-10-18T12:00:00Z"
        labels={labels}
        marketPrice="150,000"
        now={now}
        price="99,750"
      />
    );
    expect(screen.getByText("150,000").tagName).toBe("S");
    expect(screen.getByText("99,750")).toBeTruthy();
  });

  test("hides a stale, future or missing market price", () => {
    expect(isMarketPriceFresh("2026-10-16T11:59:00Z", now)).toBe(false);
    expect(isMarketPriceFresh("2026-10-25T00:00:00Z", now)).toBe(false);
    expect(isMarketPriceFresh(null, now)).toBe(false);
    expect(isMarketPriceFresh("not a date", now)).toBe(false);

    render(<SouqPrice labels={labels} marketPrice="150,000" price="99,750" />);
    expect(screen.queryByText("150,000")).toBeNull();
    expect(screen.getByText("99,750")).toBeTruthy();
  });
});

describe("NameTile", () => {
  test("names the tile by its word; a bulb tile is decorative", () => {
    render(<NameTile word="Club" />);
    expect(screen.getByRole("img", { name: "Club" })).toBeTruthy();
    const { container } = render(<NameTile />);
    expect(container.firstElementChild?.getAttribute("aria-hidden")).toBe(
      "true"
    );
  });
});
