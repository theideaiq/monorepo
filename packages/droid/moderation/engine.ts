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
 * Emoji and symbols are separators: they never end the scan early.
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

type Language = "arabic" | "english";

export interface BannedWordMatch {
  language: "arabic" | "chinese" | "english";
  reason: MatchReason;
  /** The list entry that matched. */
  word: string;
}

const MASK_CHARACTERS = /[*#]/;
const NOT_WORD_CHARACTER = /[^\p{L}*#]+/u;
const NON_LETTERS = /[^\p{L}]+/gu;
const HAS_LETTER = /\p{L}/u;
const WHITESPACE = /\s+/u;
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
  /** Entries by length, for masked and fuzzy matching. */
  byLength: Map<number, string[]>;
  /** Collapsed form → entry, for stretched letters. */
  collapsed: Map<string, string>;
  words: Set<string>;
}

const lengthOf = (text: string) => Array.from(text).length;

const indexWords = (words: Iterable<string>): WordIndex => {
  const index: WordIndex = {
    byLength: new Map(),
    collapsed: new Map(),
    words: new Set(),
  };
  for (const word of words) {
    index.words.add(word);
    index.collapsed.set(collapseRepeats(word), word);
    const length = lengthOf(word);
    index.byLength.set(length, [...(index.byLength.get(length) ?? []), word]);
  }
  return index;
};

const match = (
  language: BannedWordMatch["language"],
  reason: MatchReason,
  word: string
): BannedWordMatch => ({ language, reason, word });

/** "p*ssy" → an entry of the same length with letters in the masked spots. */
const matchMasked = (
  token: string,
  index: WordIndex,
  language: Language
): BannedWordMatch | null => {
  const letters = Array.from(token);
  const masks = letters.filter((c) => MASK_CHARACTERS.test(c)).length;
  if (masks > MAX_MASKS || letters.length - masks < 2) {
    return null;
  }
  const pattern = new RegExp(
    `^${letters.map((c) => (MASK_CHARACTERS.test(c) ? "\\p{L}" : c)).join("")}$`,
    "u"
  );
  const word = (index.byLength.get(letters.length) ?? []).find((candidate) =>
    pattern.test(candidate)
  );
  return word ? match(language, "masked", word) : null;
};

/** Small misspellings of longer entries, same first letter. */
const matchFuzzy = (
  token: string,
  index: WordIndex,
  language: Language
): BannedWordMatch | null => {
  const { minLength, threshold } = FUZZY[language];
  const length = lengthOf(token);
  if (length < minLength) {
    return null;
  }
  const candidates = [length - 1, length, length + 1]
    .filter((candidateLength) => candidateLength >= minLength)
    .flatMap((candidateLength) => index.byLength.get(candidateLength) ?? []);
  const word = candidates.find(
    (candidate) =>
      candidate[0] === token[0] && jaroWinkler(token, candidate) >= threshold
  );
  return word ? match(language, "fuzzy", word) : null;
};

const matchWord = (
  token: string,
  index: WordIndex,
  language: Language
): BannedWordMatch | null => {
  if (index.words.has(token)) {
    return match(language, "exact", token);
  }
  if (MASK_CHARACTERS.test(token)) {
    return matchMasked(token, index, language);
  }
  // Stretched letters: only when the token is longer than the entry, so
  // "con" never matches an entry like "coon".
  const stretched = index.collapsed.get(collapseRepeats(token));
  if (stretched && lengthOf(token) > lengthOf(stretched)) {
    return match(language, "stretched", stretched);
  }
  return matchFuzzy(token, index, language);
};

/** Word tokens of one whitespace-separated chunk (Chinese excluded). */
const chunkParts = (rawChunk: string) => {
  const chunk = LATIN_LIKE.test(rawChunk) ? normalizeLatin(rawChunk) : rawChunk;
  return chunk
    .split(NOT_WORD_CHARACTER)
    .filter((part) => part.length > 0 && HAS_LETTER.test(part))
    .filter((part) => detectScript(part) !== "han");
};

/** The run of single letters starting at `start` ("c u n t", "ك س"). */
const singleLetterRun = (tokens: string[], start: number) => {
  let end = start;
  while (
    end < tokens.length &&
    lengthOf(tokens[end] ?? "") === 1 &&
    tokens[end] !== CONJUNCTION
  ) {
    end += 1;
  }
  return tokens.slice(start, end);
};

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

  const matchArabic = (token: string): BannedWordMatch | null => {
    const direct = matchWord(token, arabic, "arabic");
    if (direct) {
      return direct;
    }
    const unprefixed = stripArabicPrefix(token);
    const prefixed =
      unprefixed === token ? null : matchWord(unprefixed, arabic, "arabic");
    if (prefixed) {
      return { ...prefixed, reason: "stem" };
    }
    const stem = stemArabic(token);
    const word = lengthOf(stem) >= 3 ? arabicStems.get(stem) : undefined;
    return word ? match("arabic", "stem", word) : null;
  };

  const matchToken = (token: string) =>
    detectScript(token) === "arabic"
      ? matchArabic(token)
      : matchWord(token, english, "english");

  const matchJoined = (joined: string): BannedWordMatch | null => {
    if (detectScript(joined) === "arabic") {
      return arabic.words.has(joined)
        ? match("arabic", "joined", joined)
        : null;
    }
    if (english.words.has(joined)) {
      return match("english", "joined", joined);
    }
    const phrase = joinedPhrases.get(joined);
    return phrase ? match("english", "phrase", phrase) : null;
  };

  const matchChinese = (text: string): BannedWordMatch | null => {
    for (const run of text.match(HAN_RUN) ?? []) {
      const word = list.chinese.find((entry) => run.includes(entry));
      if (word) {
        return match("chinese", "substring", word);
      }
    }
    return null;
  };

  /** Each chunk's tokens, then the chunk without separators ("f.u.c.k"). */
  const matchChunk = (parts: string[]) => {
    for (const part of parts) {
      const found = matchToken(part);
      if (found) {
        return found;
      }
    }
    return parts.length > 1 ? matchJoined(parts.join("")) : null;
  };

  /** Phrases and words split by spaces, starting at token `i`. */
  const matchAcrossTokens = (tokens: string[], i: number) => {
    const pair = tokens.slice(i, i + 2);
    if (pair.length === 2 && phrases.has(pair.join(" "))) {
      return match("english", "phrase", pair.join(" "));
    }
    // "blow job", "kill your self".
    for (const size of [2, 3]) {
      const group = tokens.slice(i, i + size);
      const found =
        group.length === size &&
        group.every((token) => detectScript(token) === "latin")
          ? matchJoined(group.join(""))
          : null;
      if (found) {
        return found;
      }
    }
    // Letters typed one by one: "c u n t", "ك س".
    const letters = singleLetterRun(tokens, i);
    const minimum = detectScript(letters[0] ?? "") === "arabic" ? 2 : 3;
    return letters.length >= minimum ? matchJoined(letters.join("")) : null;
  };

  const find = (input: string): BannedWordMatch | null => {
    const text = normalizeText(input).replace(URL_PREFIX, " ");
    const chinese = matchChinese(text);
    if (chinese) {
      return chinese;
    }

    const tokens: string[] = [];
    for (const chunk of text.split(WHITESPACE)) {
      const parts = chunkParts(chunk);
      const found = matchChunk(parts);
      if (found) {
        return found;
      }
      tokens.push(...parts);
    }

    for (let i = 0; i < tokens.length; i += 1) {
      const found = matchAcrossTokens(tokens, i);
      if (found) {
        return found;
      }
    }
    return null;
  };

  return { find };
};

const defaultModerator = createModerator();

/** The first banned word in `text` from the built-in list, or null. */
export const findBannedWord = (text: string) => defaultModerator.find(text);
