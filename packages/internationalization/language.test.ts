import { readdirSync, readFileSync } from "node:fs";
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
/** What may stay in Latin letters in Arabic copy: links, emails, {arguments}
 * and ICU syntax, and values typed exactly, which sit inside « ». */
const TYPED_OR_LINKS =
  /«[^»]*»|https?:\/\/\S+|[\w.+-]+@[\w.-]+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|iq|org|net|io|fm|cz|edu)\b(?:\/\S*)?|\{\w+\}|\{\w+,\s*(?:plural|select|selectordinal),|(?<=[\s{}])(?:zero|one|two|few|many|other|=\d+|[a-z_]+)\s*(?=\{)|<\/?\w+>/g;
const LATIN = /[A-Za-z]/;
/** Arabic in English copy. */
const ARABIC = /[\u0600-\u06FF]/;
const MSA_EMAIL = /البريد الإلكتروني|بريدك الإلكتروني/;
const SHORT_DINAR = /د\.ع/;
const DINAR_WITHOUT_IRAQI =
  /(?:\d|\})\s*دينار(?! عراقي)(?!\s*(?:واحد|لكل|للوحدة))|\(دينار\)/;

/**
 * Where Arabic is Modern Standard Arabic: what binds or is kept as a
 * record. Everything else is Iraqi Arabic.
 */
const STANDARD_ARABIC = [
  // What a person agrees to share with a partner site.
  "pass.authorize.shares",
  "pass.authorize.scopes.",
  "pass.authorize.never",
  // Printed documents.
  "app.company.document.billTo",
  "app.company.document.footer",
  "app.company.document.validUntil",
  "app.company.document.reference",
  "app.company.document.due",
  "app.company.document.paidOn",
  "web.club.surveys.certificate.issued",
  "web.club.surveys.certificate.terms",
];
const isStandard = (path: string) =>
  STANDARD_ARABIC.some((prefix) => path === prefix || path.startsWith(prefix));
const standard = arabic.filter(([path]) => isStandard(path));
const iraqi = arabic.filter(([path]) => !isStandard(path));

/** Words only Iraqi speech uses (names spelled with گ are taken out first). */
const IRAQI_WORDS =
  /(?<![؀-ۿ])(?:ماكو|اكو|هسه|شلون|شنو|شگد|راح|هاي|هذي|مو|اللي|بعدين|ويا|وياك|دز|تگدر|يگدر)(?![؀-ۿ])|[گچ]/;
/** Our names and the foreign names we spell with گ (Glow, Google, Telegram, PEGI, WCAG). */
const OUR_NAMES_WITH_GAF =
  /السوگ|سوگ|الگلوبات|گلوبات|گلوب|گلو|تلگرام|گوگل|پيگي|كاگ/g;
/** Modern Standard forms that Iraqi copy says another way. */
const STANDARD_WORDS =
  /(?<![؀-ۿ])(?:لا يوجد|لا توجد|سوف|الآن|هل|لماذا|ماذا|يمكنك|تستطيع|لم يتم|سيتم|يتم|التي|الذي|الذين|ليس|ليست|لدينا|لديك|لديه|هذه|هؤلاء|عندما|ينبغي)(?![؀-ۿ])/;
const withoutOurNames = (list: Entry[]): Entry[] =>
  list.map(([path, text]) => [path, text.replace(OUR_NAMES_WITH_GAF, "")]);

const LEGAL = new URL("../../apps/app/content/legal/", import.meta.url);
const legalPages: Entry[] = readdirSync(LEGAL)
  .filter((name) => name.endsWith(".ar.md"))
  .map((name) => [name, readFileSync(new URL(name, LEGAL), "utf8")]);

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

  test("no Arabic in English copy and no English in Arabic copy", () => {
    expect(offending(english, ARABIC)).toEqual([]);
    expect(
      arabic
        .filter(([, text]) => LATIN.test(text.replace(TYPED_OR_LINKS, "")))
        .map(([path, text]) => `${path}: ${text}`)
    ).toEqual([]);
  });

  test("one word for email and one way to write the currency in Arabic", () => {
    expect(offending(iraqi, MSA_EMAIL)).toEqual([]);
    // Amounts and field labels: "25,000 دينار عراقي" and "السعر (دينار عراقي)".
    expect(offending(arabic, SHORT_DINAR)).toEqual([]);
    expect(offending(arabic, DINAR_WITHOUT_IRAQI)).toEqual([]);
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

  test("product copy is Iraqi Arabic", () => {
    expect(offending(iraqi, STANDARD_WORDS)).toEqual([]);
  });

  test("legal pages, consent wording and documents are Modern Standard Arabic", () => {
    expect(offending(withoutOurNames(standard), IRAQI_WORDS)).toEqual([]);
    expect(offending(withoutOurNames(legalPages), IRAQI_WORDS)).toEqual([]);
  });
});
