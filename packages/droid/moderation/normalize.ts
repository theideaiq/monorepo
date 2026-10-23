/**
 * Text normalisation for the moderation engine. Messages in The IDEA's groups
 * mix Arabic (often Iraqi dialect typed with Kurdish or Persian letters),
 * English and the odd Chinese spam, and people disguise words with
 * diacritics, tatweel, zero-width characters, look-alike letters and digits.
 */

export type Script = "arabic" | "han" | "latin" | "other";

// Harakat, Quranic marks and superscript alef.
const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;
// Zero-width and bidi control characters used to split words invisibly.
const INVISIBLE = /[­؜᠎​-‏‪-‮⁠-⁩﻿]/g;

/**
 * Kurdish (Sorani/Badini) and Persian letters, and Arabic letter variants,
 * mapped to the base Arabic letter the word list uses. Iraqi users often type
 * Arabic words on Kurdish or Persian keyboards (ک for ك, ی for ي).
 */
const ARABIC_LETTER_MAP: Record<string, string> = {
  آ: "ا",
  أ: "ا",
  ؤ: "و",
  إ: "ا",
  ئ: "ي",
  ة: "ه",
  ى: "ي",
  ٱ: "ا",
  پ: "ب",
  چ: "ج",
  ڕ: "ر",
  ژ: "ز",
  ڤ: "ف",
  ک: "ك",
  گ: "ك",
  ڵ: "ل",
  ھ: "ه",
  ۆ: "و",
  ی: "ي",
  ێ: "ي",
  ە: "ه",
};

/** Digits and symbols used as letters ("b1tch", "@ss", "$lut"). */
const LEET_MAP: Record<string, string> = {
  "@": "a",
  $: "s",
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
};

/** Cyrillic and Greek look-alikes of Latin letters. */
const HOMOGLYPH_MAP: Record<string, string> = {
  α: "a",
  ν: "v",
  ο: "o",
  ρ: "p",
  а: "a",
  в: "b",
  е: "e",
  к: "k",
  м: "m",
  н: "h",
  о: "o",
  р: "p",
  с: "c",
  т: "t",
  у: "y",
  х: "x",
  ѕ: "s",
  і: "i",
  ј: "j",
};

const mapCharacters = (text: string, map: Record<string, string>) =>
  Array.from(text, (character) => map[character] ?? character).join("");

const ARABIC_LETTERS = /\p{Script=Arabic}/u;
const HAN_LETTERS = /\p{Script=Han}/u;
const LATIN_LETTERS = /\p{Script=Latin}/u;

/** The script a token is written in, judged by its first letter. */
export const detectScript = (token: string): Script => {
  for (const character of token) {
    if (ARABIC_LETTERS.test(character)) {
      return "arabic";
    }
    if (HAN_LETTERS.test(character)) {
      return "han";
    }
    if (LATIN_LETTERS.test(character)) {
      return "latin";
    }
  }
  return "other";
};

/** Strips harakat, tatweel and invisible characters. */
export const stripArabicMarks = (text: string) =>
  text.replace(ARABIC_DIACRITICS, "").replace(TATWEEL, "");

// Sorani writes the short vowel "e" as ە inside words (شەرموطە); Arabic
// leaves it out. At the end of a word it stands for ة/ه.
const KURDISH_MEDIAL_E = /ە(?=\p{Script=Arabic})/gu;

/** Maps Kurdish/Persian letters and hamza/alef variants to base Arabic. */
export const normalizeArabicLetters = (text: string) =>
  mapCharacters(text.replace(KURDISH_MEDIAL_E, ""), ARABIC_LETTER_MAP);

/** Lower-cases and folds accents, look-alike letters and leetspeak. */
export const normalizeLatin = (token: string) =>
  mapCharacters(
    mapCharacters(token.toLowerCase(), HOMOGLYPH_MAP)
      .normalize("NFKD")
      .replace(/\p{M}/gu, ""),
    LEET_MAP
  );

/**
 * The common first pass over a whole message: Unicode compatibility forms
 * (full-width letters, Arabic presentation forms), invisible characters and
 * Arabic marks.
 */
export const normalizeText = (text: string) =>
  normalizeArabicLetters(
    stripArabicMarks(text.normalize("NFKC").replace(INVISIBLE, ""))
  );

/** Collapses runs of the same letter ("fuuuck" → "fuck", "كسسس" → "كس"). */
export const collapseRepeats = (token: string) =>
  token.replace(/(\p{L})\1+/gu, "$1");
