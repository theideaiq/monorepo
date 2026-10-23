/**
 * A light Arabic stemmer (in the spirit of Light10): removes the conjunction,
 * article and preposition prefixes and the pronoun/plural suffixes that attach
 * to a word, without root extraction. Input must already be normalised
 * (`normalizeText`: ة → ه, أ/إ/آ → ا, ى → ي).
 *
 * Stripping is conservative so ordinary words aren't cut down to a banned
 * stem: a prefix or suffix is only removed when at least `MIN_STEM` letters
 * remain.
 */

const MIN_STEM = 2;
/** Single-letter prefixes need a longer remainder ("فكس" isn't "ف" + "كس"). */
const MIN_STEM_AFTER_LETTER_PREFIX = 3;

const ARTICLE_PREFIXES = ["وبال", "وكال", "وال", "فال", "بال", "كال", "لل", "ال"];
const LETTER_PREFIXES = ["و", "ف", "ب", "ل"];
const SUFFIXES = [
  "كما",
  "هما",
  "كم",
  "كن",
  "هم",
  "هن",
  "ها",
  "نا",
  "ات",
  "ان",
  "ون",
  "ين",
  "يه",
  "ه",
  "ك",
  "ي",
];

const stripPrefix = (word: string) => {
  for (const prefix of ARTICLE_PREFIXES) {
    if (word.startsWith(prefix) && word.length - prefix.length >= MIN_STEM) {
      return word.slice(prefix.length);
    }
  }
  for (const prefix of LETTER_PREFIXES) {
    if (
      word.startsWith(prefix) &&
      word.length - prefix.length >= MIN_STEM_AFTER_LETTER_PREFIX
    ) {
      return word.slice(prefix.length);
    }
  }
  return word;
};

const stripSuffix = (word: string) => {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= MIN_STEM) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
};

/** The light stem of a normalised Arabic word. */
export const stemArabic = (word: string) => stripSuffix(stripPrefix(word));

/** The word without its prefixes only (keeps suffixes like "ك" in "كسك"). */
export const stripArabicPrefix = stripPrefix;
