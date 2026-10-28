import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { RentOnly } from "@/components/store/price";
import { ProductCondition } from "@/components/store/product-condition";
import { renderWithApp } from "./render";

const WORTH = /^Worth .*59,750/;

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
});
