import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Promises, promises } from "@/components/promises";
import { renderWithApp } from "./render";

const PRICE = /The price you see is the price you pay/;
const CONDITION = /The condition we describe, or your money back/;
const ARABIC_LEGAL = /^\/ar\/legal\//;

describe("The promises", () => {
  test("each promise links to the policy section behind it", () => {
    renderWithApp(<Promises />, { locale: "en" });

    const price = screen.getByRole("link", {
      name: PRICE,
    });
    expect(price.getAttribute("href")).toBe("/legal/terms#section-4");
    const condition = screen.getByRole("link", {
      name: CONDITION,
    });
    expect(condition.getAttribute("href")).toBe("/legal/returns#section-7");
    expect(screen.getAllByRole("link")).toHaveLength(promises.length);
  });

  test("every linked section exists in both languages", () => {
    for (const { href } of promises) {
      const [path, anchor] = href.split("#");
      const slug = path.replace("/legal/", "");
      const number = anchor.replace("section-", "");
      for (const language of ["ar", "en"]) {
        const source = readFileSync(
          join(
            import.meta.dirname,
            "..",
            "content",
            "legal",
            `${slug}.${language}.md`
          ),
          "utf8"
        );
        expect(source).toMatch(new RegExp(`^## ${number}\\. `, "m"));
      }
    }
  });

  test("Arabic pages keep their language in the links", () => {
    renderWithApp(<Promises compact />, { locale: "ar" });

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(ARABIC_LEGAL);
    }
  });
});
