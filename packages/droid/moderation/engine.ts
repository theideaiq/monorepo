/**
 * The banned-words engine, rewritten from the 2022 bot's nlp.ts.
 *
 * A message is normalised (Arabic marks, Kurdish/Persian letters, look-alike
 * Latin letters, leetspeak), split into word tokens per script, and each
 * token is compared with the list:
 *
 * - exactly, and after removing Arabic prefixes or light stemming;
 * - with stretched letters collapsed ("cuuunt", "كسسس");
 * - with masked letters ("p*ssy", "c#nt") as single-letter wildcards;
 * - joined across separators ("f.u.c.k", "f u c k", "ك س", "blow job");
 * - fuzzily (Jaro-Winkler) for longer words, to catch small misspellings;
 * - as phrases over neighbouring tokens ("kill yourself");
 * - as substrings for Chinese.
 *
 * Every rule matches whole tokens, never substrings of ordinary words.
 */

import {
  collapseRepeats,
  detectScript,
  normalizeArabicLetters,
  normalizeLatin,
  normalizeText,
} from "./normalize";
import { jaroWinkler } from "./similarity";
import { stemArabic, stripArabicPrefix } from "./stem";
import { type BannedWordList, bannedWords } from "./words";

export type MatchReason =
  | "exact"
  | "fuzzy"
  | "joined"
  | "masked"
  | "phrase"
  | "stem"
  | "stretched"
  | "substring";

export interface BannedWordMatch {
  language: "arabic" | "chinese" | "english";
  reason: MatchReason;
  /** The list entry that matched. */
  word: string;
}

const MASK_CHARACTERS = /[*#]/;
const NOT_WORD_CHARACTER = /[^\p{L}*#]+/u;
const NON_LETTERS = /[^\p{L}]+/gu;
const URL_PREFIX = /\b(?:https?:\/\/|www\.)/gi;
const LATIN_LIKE = /[\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}]/u;
const HAN_RUN = /\p{Script=Han}+/gu;
const CONJUNCTION = "و";

const FUZZY = {
  arabic: { minLength: 5, threshold: 0.95 },
  english: { minLength: 6, threshold: 0.94 },
} as const;
const MAX_MASKS = 2;

interface WordIndex {
  /** Collapsed form → entry, for stretched letters. */
  collapsed: Map<string, string>;
  /** Entries by length, for masked and fuzzy matching. */
  byLength: Map<number, string[]>;
  words: Set<string>;
}

const indexWords = (words: Iterable<string>): WordIndex => {
  const index: WordIndex = {
    byLength: new Map(),
    collapsed: new Map(),
    words: new Set(),
  };
  for (const word of words) {
    index.words.add(word);
    index.collapsed.set(collapseRepeats(word), word);
    const length = Array.from(word).length;
    index.byLength.set(length, [...(index.byLength.get(length) ?? []), word]);
  }
  return index;
};

const lengthOf = (text: string) => Array.from(text).length;

export interface Moderator {
  /** The first banned word in the text, or null. */
  find: (text: string) => BannedWordMatch | null;
}

export const createModerator = (
  list: BannedWordList = bannedWords
): Moderator => {
  const english = indexWords(
    list.english.map((word) => word.toLowerCase().replace(NON_LETTERS, ""))
  );
  const phrases = new Set(list.phrases.map((phrase) => phrase.toLowerCase()));
  const joinedPhrases = new Map(
    [...phrases].map((phrase) => [phrase.replace(NON_LETTERS, ""), phrase])
  );
  const arabic = indexWords(
    list.arabic.map((word) => normalizeArabicLetters(word))
  );
  // Stems of three letters or more only: shorter stems ("زب" from "زبون")
  // would match ordinary words.
  const arabicStems = new Map<string, string>();
  for (const word of arabic.words) {
    const stem = stemArabic(word);
    if (lengthOf(stem) >= 3 && !arabicStems.has(stem)) {
      arabicStems.set(stem, word);
    }
  }

  const matchWord = (
    token: string,
    index: WordIndex,
    language: "arabic" | "english"
  ): BannedWordMatch | null => {
    if (index.words.has(token)) {
      return { language, reason: "exact", word: token };
    }

    const length = lengthOf(token);

    if (MASK_CHARACTERS.test(token)) {
      const masks = Array.from(token).filter((c) => MASK_CHARACTERS.test(c));
      if (masks.length > MAX_MASKS || length - masks.length < 2) {
        return null;
      }
      const pattern = new RegExp(
        `^${Array.from(token, (c) => (MASK_CHARACTERS.test(c) ? "\\p{L}" : c)).join("")}$`,
        "u"
      );
      const word = (index.byLength.get(length) ?? []).find((candidate) =>
        pattern.test(candidate)
      );
      return word ? { language, reason: "masked", word } : null;
    }

    // Stretched letters: only when the token is longer than the entry, so
    // "con" never matches an entry like "coon".
    const stretched = index.collapsed.get(collapseRepeats(token));
    if (stretched && length > lengthOf(stretched)) {
      return { language, reason: "stretched", word: stretched };
    }

    const { minLength, threshold } = FUZZY[language];
    if (length >= minLength) {
      for (const candidateLength of [length - 1, length, length + 1]) {
        for (const word of index.byLength.get(candidateLength) ?? []) {
          if (
            candidateLength >= minLength &&
            word[0] === token[0] &&
            jaroWinkler(token, word) >= threshold
          ) {
            return { language, reason: "fuzzy", word };
          }
        }
      }
    }

    return null;
  };

  const matchArabic = (token: string): BannedWordMatch | null => {
    const direct = matchWord(token, arabic, "arabic");
    if (direct) {
      return direct;
    }
    const unprefixed = stripArabicPrefix(token);
    if (unprefixed !== token) {
      const match = matchWord(unprefixed, arabic, "arabic");
      if (match) {
        return { ...match, reason: "stem" };
      }
    }
    const stem = stemArabic(token);
    const word = lengthOf(stem) >= 3 ? arabicStems.get(stem) : undefined;
    return word ? { language: "arabic", reason: "stem", word } : null;
  };

  const matchToken = (token: string) =>
    detectScript(token) === "arabic"
      ? matchArabic(token)
      : matchWord(token, english, "english");

  const matchJoined = (joined: string): BannedWordMatch | null => {
    if (detectScript(joined) === "arabic") {
      return arabic.words.has(joined)
        ? { language: "arabic", reason: "joined", word: joined }
        : null;
    }
    if (english.words.has(joined)) {
      return { language: "english", reason: "joined", word: joined };
    }
    const phrase = joinedPhrases.get(joined);
    return phrase ? { language: "english", reason: "phrase", word: phrase } : null;
  };

  const find = (input: string): BannedWordMatch | null => {
    const text = normalizeText(input).replace(URL_PREFIX, " ");

    for (const run of text.match(HAN_RUN) ?? []) {
      const word = list.chinese.find((entry) => run.includes(entry));
      if (word) {
        return { language: "chinese", reason: "substring", word };
      }
    }

    const tokens: string[] = [];

    for (const rawChunk of text.split(/\s+/u)) {
      const chunk = LATIN_LIKE.test(rawChunk)
        ? normalizeLatin(rawChunk)
        : rawChunk;
      const parts = chunk
        .split(NOT_WORD_CHARACTER)
        .filter((part) => part.length > 0 && /\p{L}/u.test(part))
        .filter((part) => detectScript(part) !== "han");

      for (const part of parts) {
        const match = matchToken(part);
        if (match) {
          return match;
        }
      }

      // "f.u.c.k", "porn.hub", "ass-rape": the chunk without separators.
      if (parts.length > 1) {
        const match = matchJoined(parts.join(""));
        if (match) {
          return match;
        }
      }

      tokens.push(...parts);
    }

    for (let i = 0; i < tokens.length; i++) {
      const pair = tokens.slice(i, i + 2);
      if (pair.length === 2) {
        const phrase = pair.join(" ");
        if (phrases.has(phrase)) {
          return { language: "english", reason: "phrase", word: phrase };
        }
      }

      // Words split by spaces: "blow job", "kill your self".
      for (const size of [2, 3]) {
        const group = tokens.slice(i, i + size);
        if (
          group.length === size &&
          group.every((token) => detectScript(token) === "latin")
        ) {
          const match = matchJoined(group.join(""));
          if (match) {
            return match;
          }
        }
      }

      // Letters typed one by one: "c u n t", "ك س".
      let end = i;
      while (
        end < tokens.length &&
        lengthOf(tokens[end] ?? "") === 1 &&
        tokens[end] !== CONJUNCTION
      ) {
        end++;
      }
      const letters = tokens.slice(i, end);
      const minimum = detectScript(letters[0] ?? "") === "arabic" ? 2 : 3;
      if (letters.length >= minimum) {
        const match = matchJoined(letters.join(""));
        if (match) {
          return match;
        }
      }
    }

    return null;
  };

  return { find };
};

const defaultModerator = createModerator();

/** The first banned word in `text` from the built-in list, or null. */
export const findBannedWord = (text: string) => defaultModerator.find(text);
