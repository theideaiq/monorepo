/**
 * Bidirectional text for generated images (`next/og`). Satori shapes Arabic
 * (joined letters, from a font that has them) but has no bidi algorithm: it
 * lays the words of a line out left to right whatever the script. So text is
 * split into words here and the image lays them out itself: Arabic words in
 * a right-to-left row, and runs of the other direction (an English name or a
 * number inside Arabic, Arabic inside English) kept together in their own
 * order. A word-level approximation of Unicode bidi that is right for
 * titles, places and dates.
 */

export interface TextRun {
  /** Unique within the text, for React keys. */
  readonly key: string;
  /** The run's own direction. */
  readonly rtl: boolean;
  /** Its words in reading order. */
  readonly words: readonly string[];
}

export interface BidiText {
  /** The paragraph direction, from its first strong letter (like dir=auto). */
  readonly rtl: boolean;
  /**
   * In reading order. Runs in the paragraph's direction hold one word each
   * (so lines can wrap between them); runs of the other direction hold all
   * their words.
   */
  readonly runs: readonly TextRun[];
}

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const ARABIC_LETTER = /[ؠ-يٮ-ۓەۮ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const LETTER = /\p{L}/u;
const LATIN_OR_DIGIT = /[\p{L}\p{N}]/u;
/** Invisible direction marks Intl puts in Arabic dates; satori can't draw them. */
const DIRECTION_MARKS = /[‎‏؜‪-‮⁦-⁩]/g;
/** Arabic comma, semicolon and question mark stuck to the end of a number or Latin word. */
const TRAILING_ARABIC_PUNCTUATION = /^(.*[^،؛؟])([،؛؟]+)$/u;
const WHITESPACE = /\s+/;

type Strength = "ltr" | "neutral" | "rtl";

const strengthOf = (word: string): Strength => {
  if (ARABIC.test(word)) {
    return "rtl";
  }
  return LATIN_OR_DIGIT.test(word) ? "ltr" : "neutral";
};

/** True when the text has any Arabic-script character. */
export const hasArabic = (text: string) => ARABIC.test(text);

/** True when the first letter is Arabic (numbers and symbols don't count). */
export const isRtlText = (text: string) => {
  for (const character of text) {
    if (ARABIC_LETTER.test(character)) {
      return true;
    }
    if (LETTER.test(character)) {
      return false;
    }
  }
  return false;
};

const tokenize = (text: string) =>
  text
    .replace(DIRECTION_MARKS, "")
    .split(WHITESPACE)
    .filter(Boolean)
    .flatMap((word) => {
      const match = ARABIC.test(word.slice(0, -1))
        ? null
        : TRAILING_ARABIC_PUNCTUATION.exec(word);
      return match?.[1] && match[2] ? [match[1], match[2]] : [word];
    });

/** Splits text into runs to lay out as `isRtl ? row-reverse : row`. */
export const bidiText = (text: string): BidiText => {
  const rtl = isRtlText(text);
  const base: Strength = rtl ? "rtl" : "ltr";
  const words = tokenize(text);
  const strengths = words.map(strengthOf);

  // A neutral word between two strong words of the same direction takes it;
  // otherwise the paragraph's.
  const resolved = strengths.map((strength, index) => {
    if (strength !== "neutral") {
      return strength;
    }
    const before = strengths
      .slice(0, index)
      .reverse()
      .find((s) => s !== "neutral");
    const after = strengths.slice(index + 1).find((s) => s !== "neutral");
    return before && before === after ? before : base;
  });

  const runs: { key: string; rtl: boolean; words: string[] }[] = [];
  for (const [index, word] of words.entries()) {
    const direction = resolved[index];
    const previous = runs.at(-1);
    if (
      direction !== base &&
      previous &&
      previous.rtl === (direction === "rtl") &&
      previous.rtl !== rtl
    ) {
      previous.words.push(word);
    } else {
      runs.push({ key: `${index}`, rtl: direction === "rtl", words: [word] });
    }
  }
  return { rtl, runs };
};

/** Shortens text to at most `max` characters at a word boundary, with "…". */
export const clampText = (text: string, max: number) => {
  const clean = text.replace(DIRECTION_MARKS, "").trim();
  if (clean.length <= max) {
    return clean;
  }
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  // A word of its own, so it lands at the end in either direction.
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()} …`;
};
