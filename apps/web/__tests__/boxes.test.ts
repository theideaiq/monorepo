import { describe, expect, it } from "vitest";
import {
  type Box,
  boxParts,
  boxThemes,
  isSlot,
  partName,
  themeReady,
} from "@/lib/boxes";

const box: Box = {
  box_parts: [
    {
      category: { name_ar: "الموسيقى", name_en: "Music" },
      format: "Vinyl",
      id: "slot",
      position: 11,
      product: null,
      quantity: 3,
    },
    {
      category: null,
      format: null,
      id: "turntable",
      position: 1,
      product: { name_ar: "مشغل", name_en: "Turntable", slug: "turntable" },
      quantity: 1,
    },
  ],
  box_themes: [
    { active: true, id: "jazz", name_ar: "جاز", name_en: "Jazz", position: 2 },
    { active: false, id: "old", name_ar: "قديم", name_en: "Old", position: 0 },
    { active: true, id: "rock", name_ar: "روك", name_en: "Rock", position: 1 },
  ],
  min_value: 150_000,
  product_id: "box",
};

describe("boxes", () => {
  it("lists the fixed parts first, then the slots", () => {
    expect(boxParts(box).map((part) => part.id)).toEqual(["turntable", "slot"]);
    expect(boxParts(box).map(isSlot)).toEqual([false, true]);
  });

  it("names a slot by its format and category", () => {
    const [turntable, slot] = boxParts(box);
    expect(partName(turntable as never, "en")).toBe("Turntable");
    expect(partName(slot as never, "ar")).toBe("Vinyl · الموسيقى");
  });

  it("offers the active themes in order and needs one picked", () => {
    expect(boxThemes(box).map((theme) => theme.id)).toEqual(["rock", "jazz"]);
    expect(boxThemes(null)).toEqual([]);
    expect(themeReady(boxThemes(box), null)).toBe(false);
    expect(themeReady(boxThemes(box), "rock")).toBe(true);
    expect(themeReady([], null)).toBe(true);
  });
});
