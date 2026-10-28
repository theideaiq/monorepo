import { NameTile } from "@repo/design-system/components/brand/name-tile";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

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
