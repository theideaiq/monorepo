import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { PlanChooser, PlanCompare } from "@/components/plus/plan-compare";
import { renderWithApp } from "./render";

const plans = [
  {
    amount: 14_750,
    bulb_rate: "3.00",
    currency: "IQD",
    free_delivery: false,
    home_swaps: 1,
    id: "plus-glow",
    name: "Plus Glow",
    rental_slots: 1,
  },
  {
    amount: 22_750,
    bulb_rate: "4.00",
    currency: "IQD",
    free_delivery: true,
    home_swaps: 2,
    id: "plus-shine",
    name: "Plus Shine",
    rental_slots: 2,
  },
];

const ITEMS = /Items at a time/;

describe("Plus plans side by side", () => {
  test("every row comes from the plans themselves", () => {
    renderWithApp(<PlanCompare per="a month" plans={plans} />, {
      locale: "en",
    });
    expect(
      screen.getByRole("columnheader", { name: "Plus Shine" })
    ).toBeTruthy();
    const items = screen.getByRole("row", { name: ITEMS });
    expect(items.textContent).toContain("1");
    expect(items.textContent).toContain("2");
    expect(screen.getByText("4%")).toBeTruthy();
    expect(screen.getByLabelText("Not included")).toBeTruthy();
    expect(screen.getByLabelText("Included")).toBeTruthy();
  });

  test("nothing to compare with one plan", () => {
    const { container } = renderWithApp(
      <PlanCompare per="a month" plans={plans.slice(0, 1)} />,
      { locale: "en" }
    );
    expect(container.textContent).toBe("");
  });

  test("Help me choose picks the plan with that many items at once", () => {
    let picked = "";
    renderWithApp(
      <PlanChooser
        onPick={(id) => {
          picked = id;
        }}
        plans={plans}
        selected="plus-glow"
      />,
      { locale: "en" }
    );
    screen.getByRole("button", { name: "2 at a time" }).click();
    expect(picked).toBe("plus-shine");
    expect(
      screen
        .getByRole("button", { name: "One at a time" })
        .getAttribute("aria-pressed")
    ).toBe("true");
  });
});
