/** A survey question as the builder and the answer page use it. */
export interface SurveyQuestion {
  attention_answer?: string | null;
  id?: string;
  kind: "multiple" | "number" | "scale" | "single" | "text";
  options: string[];
  prompt: string;
  required: boolean;
}

/** Free (answer to get answers) or Boosted (paid in IQD, rewarded in Bulbs). */
export type SurveyKind = "boosted" | "free";

/** Why a submitted response doesn't count (`survey_responses.excluded_reason`). */
export type ExcludedReason = "attention" | "too_fast";

/** Answers by question id, as `submit_survey()` takes them. */
export type SurveyAnswers = Record<string, number | string | string[]>;

/** One submitted response, from `survey_results()`. */
export interface SurveyResult {
  answers: Record<string, unknown>;
  counted: boolean | null;
  response_id: string;
  submitted_at: string | null;
}

/** Seconds each kind of question takes, after 30 to read the consent (`private.survey_estimate`). */
const QUESTION_SECONDS: Record<SurveyQuestion["kind"], number> = {
  multiple: 12,
  number: 10,
  scale: 6,
  single: 8,
  text: 45,
};

/** The time to answer, estimated from the questions. */
export const surveyEstimate = (questions: readonly SurveyQuestion[]) =>
  30 +
  questions.reduce(
    (total, question) => total + QUESTION_SECONDS[question.kind],
    0
  );

/** Bulbs a response earns: 100 a minute, from 200 to 2,000 (`private.survey_reward_for`). */
export const surveyReward = (seconds: number) =>
  Math.min(2000, Math.max(200, Math.round((Math.max(seconds, 0) * 100) / 60)));

/** Whole minutes for "about N minutes", at least 1. */
export const surveyMinutes = (seconds: number) =>
  Math.max(1, Math.round(seconds / 60));

/** What a Boosted survey costs its creator in IQD: the reward × 1.1 for each response. */
export const surveyCost = (reward: number, wanted: number, feeRate = 10) =>
  // In hundredths of a Bulb, so 2 × 50 × 1.1 is 110 and not 111.
  Math.ceil(Math.round(reward * wanted * (100 + feeRate) * 100) / 10_000);

/** Whether an answer is given (required questions need one). */
const isAnswered = (value: SurveyAnswers[string] | undefined) =>
  value !== undefined &&
  value !== "" &&
  !(Array.isArray(value) && value.length === 0);

/** The required questions still without an answer. */
export const missingAnswers = (
  questions: readonly SurveyQuestion[],
  answers: SurveyAnswers
) =>
  questions.filter(
    (question) =>
      question.required && question.id && !isAnswered(answers[question.id])
  );

/** An answer as one cell of an export. */
const cell = (value: unknown) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.join("; ");
  }
  return String(value);
};

/** The export's rows: a header, then one row per response. */
export const resultRows = (
  questions: readonly SurveyQuestion[],
  results: readonly SurveyResult[]
) => [
  ["response", "submitted_at", "counted", ...questions.map((q) => q.prompt)],
  ...results.map((result, index) => [
    String(index + 1),
    result.submitted_at ?? "",
    result.counted ? "1" : "0",
    ...questions.map((question) =>
      cell(question.id ? result.answers[question.id] : undefined)
    ),
  ]),
];

const QUOTE = /"/g;
const NEEDS_QUOTES = /[",\n\r]/;

/** CSV (UTF-8 with a byte-order mark, so Excel reads Arabic). */
export const toCsv = (rows: readonly (readonly string[])[]) =>
  `﻿${rows
    .map((row) =>
      row
        .map((value) =>
          NEEDS_QUOTES.test(value) ? `"${value.replace(QUOTE, '""')}"` : value
        )
        .join(",")
    )
    .join("\r\n")}`;

const XML_ESCAPES: Record<string, string> = {
  "'": "&apos;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
const XML_SPECIAL = /[&<>"']/g;
const xml = (value: string) =>
  value.replace(XML_SPECIAL, (character) => XML_ESCAPES[character] ?? "");

/** An Excel workbook (XML Spreadsheet 2003, opened by Excel and others). */
export const toExcel = (rows: readonly (readonly string[])[]) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    '<Worksheet ss:Name="Responses"><Table>',
    ...rows.map(
      (row) =>
        `<Row>${row
          .map(
            (value) =>
              `<Cell><Data ss:Type="String">${xml(value)}</Data></Cell>`
          )
          .join("")}</Row>`
    ),
    "</Table></Worksheet></Workbook>",
  ].join("\n");

/**
 * An SPSS syntax file that reads the CSV export (`responses.csv`) and
 * labels each variable with its question.
 */
export const toSpssSyntax = (questions: readonly SurveyQuestion[]) => {
  const names = questions.map((_, index) => `q${index + 1}`);
  const label = (text: string) => text.replace(QUOTE, "'");
  return [
    "* Reads responses.csv, exported from the Club.",
    "GET DATA /TYPE=TXT /FILE='responses.csv' /ENCODING='UTF8'",
    "  /DELIMITERS=',' /QUALIFIER='\"' /FIRSTCASE=2",
    "  /VARIABLES=response F8.0 submitted_at A30 counted F1.0",
    ...names.map((name) => `  ${name} A500`),
    ".",
    "VARIABLE LABELS",
    ...questions.map(
      (question, index) => `  ${names[index]} "${label(question.prompt)}"`
    ),
    ".",
    "EXECUTE.",
  ].join("\n");
};

const SURVEY_ERRORS = {
  "A survey needs 1 to 60 questions": "questions",
  "Add the consent text": "consent",
  "Answer every required question": "required",
  "Choice questions need at least 2 options": "options",
  "Invalid answers": "invalid",
  "Not enough Bulbs for the rewards": "bulbs",
  "Only verified students create surveys": "notStudent",
  "This survey has enough answers from people like you": "quotaFull",
  "This survey isn't open to you": "notOpen",
  "You already answered this survey": "answered",
  "You've answered enough Boosted surveys today": "dailyLimit",
} as const;

export type SurveyError =
  | (typeof SURVEY_ERRORS)[keyof typeof SURVEY_ERRORS]
  | "failed";

/** A database error as a message key. */
export const surveyError = (message: string | undefined): SurveyError =>
  (message && SURVEY_ERRORS[message as keyof typeof SURVEY_ERRORS]) || "failed";

/** A question's answers in short: option counts, or the average. */
export const questionSummary = (
  question: SurveyQuestion,
  results: readonly SurveyResult[]
) => {
  const values = results
    .map((result) => (question.id ? result.answers[question.id] : undefined))
    .filter((value) => value !== undefined && value !== null && value !== "");
  if (question.kind === "single" || question.kind === "multiple") {
    return {
      answered: values.length,
      options: question.options.map((option) => ({
        count: values.filter((value) =>
          Array.isArray(value) ? value.includes(option) : value === option
        ).length,
        option,
      })),
    };
  }
  if (question.kind === "scale" || question.kind === "number") {
    const numbers = values.map(Number).filter(Number.isFinite);
    return {
      answered: numbers.length,
      average:
        numbers.length > 0
          ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length
          : null,
    };
  }
  return { answered: values.length };
};

/** Saves text as a file the browser downloads. */
export const downloadText = (name: string, type: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

/** Targeting fields a creator can cap the share of (`surveys.quotas`). */
export const QUOTA_FIELDS = [
  "university",
  "major",
  "year",
  "governorate",
] as const;

export type QuotaField = (typeof QUOTA_FIELDS)[number];

/** "Who answered" (`survey_audience()`): counts, the median time and groups of 5 or more. */
export interface SurveyAudience {
  breakdown: Partial<Record<QuotaField, { count: number; value: string }[]>>;
  counted: number;
  excluded: number;
  finished: number;
  median_seconds: number | null;
  quotas: Partial<Record<QuotaField, number>>;
  started: number;
  wanted: number;
}
