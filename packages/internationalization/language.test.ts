import { describe, expect, test } from "vitest";
import ar from "./messages/ar.json";
import en from "./messages/en.json";

/**
 * The language standard (docs/brand/BRAND_GUIDELINES.md, section 3.6):
 * the rules every message in both languages follows, so the same thing is
 * always written the same way.
 */

type Entry = [path: string, text: string];

const entries = (value: unknown, prefix = ""): Entry[] => {
  if (typeof value === "string") {
    return [[prefix, value]];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => entries(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      entries(item, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [];
};

const english = entries(en);
const arabic = entries(ar);
const arabicByPath = new Map(arabic);

/** Messages that quote a "!" rather than exclaim (a symbol, a user's example). */
const MAY_EXCLAIM = new Set([
  "auth.password.passwordHint",
  "app.settings.password.hint",
  "app.checkout.gift.messagePlaceholder",
]);

const offending = (list: Entry[], rule: RegExp, except = new Set<string>()) =>
  list
    .filter(([path, text]) => !except.has(path) && rule.test(text))
    .map(([path, text]) => `${path}: ${text}`);

/** One Arabic word for each common button, the Iraqi imperative. */
const BUTTONS: Record<string, string> = {
  Accept: "اقبل",
  Add: "ضيف",
  Approve: "وافق",
  Back: "ارجع",
  Cancel: "إلغاء",
  Close: "سدّ",
  Confirm: "أكّد",
  Continue: "كمّل",
  Decline: "ارفض",
  Delete: "امسح",
  Edit: "عدّل",
  Publish: "انشر",
  Reject: "ارفض",
  Remove: "شيل",
  Save: "احفظ",
  Total: "المجموع",
};

const BRITISH =
  /\b(?:cancell(?:ed|ing)|behaviour|colour|licence|favourite|organis(?:e|ed|ation)|centre|catalogue|travell(?:ed|ing)|programme|cheque)\b/i;
const CURLY_OR_DOTS = /[“”‘]|\.\.\./;
const EXCLAMATION = /!/;
const ARABIC_MARKS =
  /[\u0600-\u06FF][,;?]|"|[\u0660-\u0669\u06F0-\u06F9]|\.\.\./;
const TANWEEN_ON_ALEF = /ا\u064B/;
const ARABIZED_NAMES = /تيليغرام|تيليجرام|تلگرام|واتساب|واتس اب/;
const MSA_EMAIL = /البريد الإلكتروني/;
const DINAR_AFTER_AMOUNT =
  /\(دينار\)|(?:\d|\})\s*دينار(?!\s*(?:واحد|لكل|للوحدة))/;

describe("language standard", () => {
  test("English is American English", () => {
    expect(offending(english, BRITISH)).toEqual([]);
  });

  test("straight quotes and one ellipsis character in English", () => {
    expect(offending(english, CURLY_OR_DOTS)).toEqual([]);
  });

  test("no exclamation marks in the product", () => {
    expect(offending(english, EXCLAMATION, MAY_EXCLAIM)).toEqual([]);
    expect(offending(arabic, EXCLAMATION, MAY_EXCLAIM)).toEqual([]);
  });

  test("Arabic punctuation, quotes and digits", () => {
    // ، ؛ ؟ after Arabic, «» for quotes, Latin digits, … not three dots.
    expect(offending(arabic, ARABIC_MARKS)).toEqual([]);
  });

  test("Arabic tanween sits on the letter before the alef", () => {
    expect(offending(arabic, TANWEEN_ON_ALEF)).toEqual([]);
  });

  test("other companies' names stay in Latin letters in Arabic", () => {
    expect(offending(arabic, ARABIZED_NAMES)).toEqual([]);
  });

  test("one word for email and one way to write the currency in Arabic", () => {
    expect(offending(arabic, MSA_EMAIL)).toEqual([]);
    // Amounts and field labels: "25,000 د.ع." and "السعر (د.ع)".
    expect(offending(arabic, DINAR_AFTER_AMOUNT)).toEqual([]);
  });

  test("each common button has one Arabic word", () => {
    const mismatched = english
      .filter(([path, text]) => {
        const expected = BUTTONS[text];
        return expected !== undefined && arabicByPath.get(path) !== expected;
      })
      .map(
        ([path, text]) =>
          `${path}: "${text}" should be "${BUTTONS[text]}", is "${arabicByPath.get(path)}"`
      );
    expect(mismatched).toEqual([]);
  });

  test("a repeated English message has one Arabic translation", () => {
    // Statuses and labels can change with gender and context, so this
    // covers whole sentences only.
    const translations = new Map<string, Set<string>>();
    for (const [path, text] of english) {
      if (text.split(" ").length < 4 || !text.endsWith(".")) {
        continue;
      }
      const set = translations.get(text) ?? new Set<string>();
      set.add(arabicByPath.get(path) ?? "");
      translations.set(text, set);
    }
    const differing = [...translations]
      .filter(([, set]) => set.size > 1)
      .map(([text, set]) => `${text} → ${[...set].join(" | ")}`);
    expect(differing).toEqual([]);
  });
});
