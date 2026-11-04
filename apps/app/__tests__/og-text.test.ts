import { describe, expect, test } from "vitest";
import { bidiText, clampText, isRtlText } from "@/lib/og-text";

const words = (text: string) =>
  bidiText(text).runs.map((run) => [run.rtl, run.words.join(" ")]);

describe("bidi text for share images", () => {
  test("takes the direction from the first letter", () => {
    expect(isRtlText("ليلة ألعاب")).toBe(true);
    expect(isRtlText("20 تشرين الثاني")).toBe(true);
    expect(isRtlText("FC 26: ليلة")).toBe(false);
    expect(isRtlText("2026")).toBe(false);
  });

  test("gives each Arabic word its own run, in reading order", () => {
    expect(words("أمسية ألعاب الطاولة")).toEqual([
      [true, "أمسية"],
      [true, "ألعاب"],
      [true, "الطاولة"],
    ]);
  });

  test("keeps Latin words and numbers inside Arabic together", () => {
    expect(words("ليلة ألعاب EA Sports FC 26 في بغداد")).toEqual([
      [true, "ليلة"],
      [true, "ألعاب"],
      [false, "EA Sports FC 26"],
      [true, "في"],
      [true, "بغداد"],
    ]);
  });

  test("keeps Arabic inside English together", () => {
    expect(words("Meetup at بيت الثقافة tonight")).toEqual([
      [false, "Meetup"],
      [false, "at"],
      [true, "بيت الثقافة"],
      [false, "tonight"],
    ]);
  });

  test("drops direction marks and splits an Arabic comma off a number", () => {
    expect(words("الجمعة، 20 تشرين الثاني 2026، 7:30‏ م")).toEqual([
      [true, "الجمعة،"],
      [false, "20"],
      [true, "تشرين"],
      [true, "الثاني"],
      [false, "2026"],
      [true, "،"],
      [false, "7:30"],
      [true, "م"],
    ]);
  });

  test("a dash between times takes the paragraph's direction", () => {
    expect(words("7:30 م – 10:00 م").map(([rtl]) => rtl)).toEqual([
      false,
      true,
      true,
      false,
      true,
    ]);
    expect(words("7:30 PM – 10:00 PM")).toEqual([
      [false, "7:30"],
      [false, "PM"],
      [false, "–"],
      [false, "10:00"],
      [false, "PM"],
    ]);
  });

  test("clamps long text at a word, with the ellipsis as its own word", () => {
    expect(clampText("short", 10)).toBe("short");
    expect(clampText("one two three four five", 14)).toBe("one two three …");
    expect(words(clampText("ليلة ألعاب طويلة جداً جداً", 16)).at(-1)).toEqual([
      true,
      "…",
    ]);
  });
});
