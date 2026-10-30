import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { CoverCard } from "@/components/store/cover-card";
import { RentOnly } from "@/components/store/price";
import { ProductCondition } from "@/components/store/product-condition";
import { renderWithApp } from "./render";

const WORTH = /^Worth .*59,750/;
const PRICE = /^69,750/;

describe("store components", () => {
  test("a rental-only item reads Rent, with its worth in small print", () => {
    renderWithApp(<RentOnly price={59_750} />, { locale: "en" });
    expect(screen.getByText("Rent with Plus")).toBeTruthy();
    expect(screen.getByText(WORTH)).toBeTruthy();
  });

  test("conditions are plain labels, shown only for items that aren't new", () => {
    const { container } = renderWithApp(
      <>
        <ProductCondition product={{ condition: "open_box", kind: "sale" }} />
        <ProductCondition
          product={{ condition: "refurbished", kind: "sale" }}
        />
        <ProductCondition product={{ condition: "new", kind: "sale" }} />
        <ProductCondition product={{ condition: "used", kind: "rental" }} />
      </>,
      { locale: "en" }
    );
    expect(screen.getByText("Open box")).toBeTruthy();
    expect(screen.getByText("Refurbished")).toBeTruthy();
    expect(screen.queryByText("New")).toBeNull();
    expect(screen.queryByText("Used")).toBeNull();
    expect(container.querySelector("svg")).toBeNull();
  });

  const cover = {
    category_id: null,
    compare_at_price: null,
    condition: "new" as const,
    currency: "IQD",
    featured: false,
    id: "g1",
    images: ["games/elden.jpg"],
    kind: "sale" as const,
    name_ar: "إلدن رينغ",
    name_en: "Elden Ring",
    price: 69_750,
    rentable: true,
    slug: "elden-ring",
    stock_count: 3,
    variants: [],
  };

  test("a cover card: art, title, price in mono and the Plus mark", () => {
    renderWithApp(<CoverCard product={cover} />, { locale: "en" });
    expect(screen.getByRole("link").getAttribute("href")).toBe(
      "/store/elden-ring"
    );
    expect(screen.getByText("Elden Ring")).toBeTruthy();
    expect(screen.getByText(PRICE).className).toContain("font-mono");
    expect(screen.getByText("In Plus")).toBeTruthy();
  });

  test("on Plus, a cover says its availability instead of the price", () => {
    renderWithApp(
      <CoverCard availability="long" needsPlan="Blaze" plus product={cover} />,
      { locale: "ar" }
    );
    expect(screen.getByText("انتظار طويل")).toBeTruthy();
    expect(screen.getByText("يتطلّب Blaze")).toBeTruthy();
    expect(screen.queryByText(PRICE)).toBeNull();
    expect(screen.queryByText("في الپلص")).toBeNull();
  });
});
