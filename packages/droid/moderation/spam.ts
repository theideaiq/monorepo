/**
 * Investment-scam spam ("earn $500 daily trading crypto, DM me"). A message
 * counts as spam only when it combines an investment topic with a promise of
 * returns and either a call to contact someone or a money amount, so people
 * talking about Bitcoin, investing in education or a game's profit system are
 * left alone. Terms match whole words (with Arabic prefixes such as ال and و),
 * never substrings: "profitable" does not hide inside "nonprofit" and "btc"
 * does not match inside other words.
 */

import { normalizeText } from "./normalize";

const LATIN_BOUNDARY_START = "(?<![\\p{L}\\p{N}])";
const LATIN_BOUNDARY_END = "(?![\\p{L}\\p{N}])";
// Arabic words take attached prefixes (و، ف، ب، ل، ال).
const ARABIC_PREFIXES = "(?:و|ف)?(?:ب|ل|ك)?(?:ال)?";

const words = (latin: string[], arabic: string[]) =>
  new RegExp(
    [
      `${LATIN_BOUNDARY_START}(?:${latin.join("|")})${LATIN_BOUNDARY_END}`,
      `(?<!\\p{L})${ARABIC_PREFIXES}(?:${arabic.join("|")})(?!\\p{L})`,
    ].join("|"),
    "iu"
  );

const INVESTMENT = words(
  [
    "invest(?:s|ed|ing|ment|ments|or|ors)?",
    // Not "trade": "trade in your PS4, earn store credit" is a real offer.
    "trading",
    "traders?",
    "forex",
    "crypto(?:currency|currencies)?",
    "bitcoins?",
    "btc",
    "eth(?:ereum)?",
    "usdt",
    "binance",
    "nfts?",
  ],
  [
    "استثمار",
    "استثماري",
    "استثماريه",
    "استثمر",
    "تداول",
    "فوركس",
    "كريبتو",
    "بيتكوين",
    "بتكوين",
    "عملات رقميه",
    "العملات الرقميه",
    "تعدين",
    "توصيات",
  ]
);

const PROMISE = words(
  [
    "profits?",
    "earn(?:s|ed|ing|ings)?",
    "returns?",
    "income",
    "guarantee(?:d)?",
    "daily",
    "weekly",
    "per (?:day|week|hour)",
    "passive",
    "withdraw(?:al|als)?",
    "double your",
  ],
  [
    "ربح",
    "ارباح",
    "ربحك",
    "مضمون",
    "مضمونه",
    "يومي",
    "يوميا",
    "اسبوعيا",
    "دخل",
    "سحب",
    "عوائد",
  ]
);

const CALL_TO_ACTION = new RegExp(
  [
    `${LATIN_BOUNDARY_START}(?:dm|inbox|pm|message|contact|text|whats ?app|telegram)(?: me| us| now)?${LATIN_BOUNDARY_END}`,
    "t\\.me\\/",
    "wa\\.me\\/",
    "@[a-z0-9_]{5,}",
    `(?<!\\p{L})(?:راسلني|راسلنا|تواصل|للتواصل|خاص|واتساب|واتس)(?!\\p{L})`,
  ].join("|"),
  "iu"
);

const MONEY_AMOUNT =
  /(?:[$€£]\s?\d)|(?:\d[\d,.]*\s?(?:\$|usd|usdt|dollars?|%|٪|دولار|الف|مليون))/iu;

export interface SpamVerdict {
  reasons: string[];
  spam: boolean;
}

export const detectSpam = (input: string): SpamVerdict => {
  const text = normalizeText(input);
  const reasons: string[] = [];

  if (INVESTMENT.test(text)) {
    reasons.push("investment");
  }
  if (PROMISE.test(text)) {
    reasons.push("promise");
  }
  if (CALL_TO_ACTION.test(text)) {
    reasons.push("contact");
  }
  if (MONEY_AMOUNT.test(text)) {
    reasons.push("amount");
  }

  const spam =
    reasons.includes("investment") &&
    reasons.includes("promise") &&
    (reasons.includes("contact") || reasons.includes("amount"));

  return { reasons, spam };
};
