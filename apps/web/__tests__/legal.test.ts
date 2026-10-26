import ar from "@repo/internationalization/messages/ar.json";
import en from "@repo/internationalization/messages/en.json";
import { describe, expect, it } from "vitest";
import { isLegalSlug, legalDocuments, readLegalDocument } from "@/lib/legal";

const LEGAL_LINK = /\]\(\/legal\/([\w-]+)\)/g;
const BARE_NAME = /(?<!The )IDEA/;
const ARABIC_INDIC_DIGITS = /[٠-٩]/;

describe("legal documents", () => {
  it("lists the fourteen policies in order", () => {
    expect(legalDocuments.map(({ slug }) => slug)).toEqual([
      "terms",
      "privacy",
      "delivery",
      "returns",
      "condition",
      "plus",
      "rewards",
      "sell",
      "club",
      "surveys",
      "business",
      "accessibility",
      "security",
      "copyright",
    ]);
    expect(isLegalSlug("refund")).toBe(false);
  });

  it("has a title and description in both languages for every policy", () => {
    for (const messages of [ar, en]) {
      const documents = messages.web.legal.documents as Record<
        string,
        { title: string; description: string }
      >;
      expect(Object.keys(documents)).toEqual(
        legalDocuments.map(({ slug }) => slug)
      );
      for (const { title, description } of Object.values(documents)) {
        expect(title).toBeTruthy();
        expect(description).toBeTruthy();
      }
    }
  });

  for (const { slug } of legalDocuments) {
    for (const locale of ["ar", "en"]) {
      it(`${slug} (${locale}) links only to existing policies`, async () => {
        const source = await readLegalDocument(slug, locale);
        expect(source.length).toBeGreaterThan(0);
        for (const [, target] of source.matchAll(LEGAL_LINK)) {
          expect(isLegalSlug(target ?? "")).toBe(true);
        }
        expect(source).not.toMatch(BARE_NAME);
        expect(source).not.toMatch(ARABIC_INDIC_DIGITS);
        expect(source.toLowerCase()).not.toContain("account");
      });
    }
  }
});
