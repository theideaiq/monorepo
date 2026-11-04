import {
  SWITCH_ON_KEY,
  SwitchOn,
} from "@repo/design-system/components/brand/switch-on";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { DisplayShelf } from "@/components/store/display-shelf";
import { DISPLAY_MIN, withCovers } from "@/lib/display";
import { renderWithApp } from "./render";

const RECORD_ONE = /Record 1/;

const record = (id: string, image: string | null) => ({
  category_id: null,
  compare_at_price: null,
  condition: "new" as const,
  currency: "IQD",
  featured: false,
  id,
  images: image ? [image] : [],
  kind: "sale" as const,
  name_ar: `أسطوانة ${id}`,
  name_en: `Record ${id}`,
  price: 39_750,
  rentable: false,
  slug: `record-${id}`,
  stock_count: 2,
  variants: [],
});

const moment = () =>
  render(
    <SwitchOn hint="Tap the bulb" label="Switch on">
      <p>Switch on.</p>
    </SwitchOn>
  );

describe("the Switch on moment", () => {
  afterEach(() => window.localStorage.clear());

  test("the bulb waits unlit with a hint; one tap reveals the line", () => {
    moment();
    const bulb = screen.getByRole("button", { name: "Switch on" });
    expect(bulb.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Tap the bulb")).toBeTruthy();
    fireEvent.click(bulb);
    expect(bulb.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Tap the bulb")).toBeNull();
    expect(screen.getByText("Switch on.").parentElement?.className).toContain(
      "motion-safe:animate-switch-on"
    );
    expect(window.localStorage.getItem(SWITCH_ON_KEY)).toBe("1");
  });

  test("a visitor who switched it on finds it on, without the motion", async () => {
    window.localStorage.setItem(SWITCH_ON_KEY, "1");
    moment();
    const bulb = screen.getByRole("button", { name: "Switch on" });
    await waitFor(() => expect(bulb.getAttribute("aria-pressed")).toBe("true"));
    expect(screen.queryByText("Tap the bulb")).toBeNull();
    expect(
      screen.getByText("Switch on.").parentElement?.className
    ).not.toContain("animate-switch-on");
  });
});

describe("the Music crate and Books shelf", () => {
  test("only products with a real cover go on display", () => {
    const covered = withCovers([
      record("1", "music/1.jpg"),
      record("2", null),
      record("3", "music/3.jpg"),
    ]);
    expect(covered.map((product) => product.id)).toEqual(["1", "3"]);
    expect(DISPLAY_MIN).toBeGreaterThan(1);
  });

  test("a crate lists each record with its cover, title and price", () => {
    renderWithApp(
      <DisplayShelf
        action={{ href: "/store/music", label: "View all" }}
        kind="crate"
        products={withCovers(
          ["1", "2", "3", "4"].map((id) => record(id, `music/${id}.jpg`))
        )}
        title="From the record crate"
      />,
      { locale: "en" }
    );
    expect(
      screen.getByRole("heading", { name: "From the record crate" })
    ).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(
      screen.getByRole("link", { name: RECORD_ONE }).getAttribute("href")
    ).toBe("/store/record-1");
  });
});
