import { describe, expect, it } from "vitest";
import {
  missingAnswers,
  questionSummary,
  resultRows,
  type SurveyQuestion,
  surveyCost,
  surveyError,
  surveyReward,
  toCsv,
  toExcel,
  toSpssSyntax,
} from "@/lib/surveys";

const questions: SurveyQuestion[] = [
  {
    id: "q1",
    kind: "single",
    options: ["Yes", "No"],
    prompt: "Do you rent games?",
    required: true,
  },
  {
    id: "q2",
    kind: "multiple",
    options: ["Music", "Games", "Books"],
    prompt: 'Which, "if any"?',
    required: false,
  },
  { id: "q3", kind: "scale", options: [], prompt: "How much?", required: true },
];

const results = [
  {
    answers: { q1: "Yes", q2: ["Music", "Games"], q3: 4 },
    counted: true,
    response_id: "r1",
    submitted_at: "2026-10-01T10:00:00Z",
  },
  {
    answers: { q1: "No", q3: 2 },
    counted: false,
    response_id: "r2",
    submitted_at: "2026-10-01T11:00:00Z",
  },
];

describe("survey rewards", () => {
  it("grow with length, from 200 to 1,000 Bulbs", () => {
    expect(surveyReward(1)).toBe(200);
    expect(surveyReward(4)).toBe(300);
    expect(surveyReward(10)).toBe(500);
    expect(surveyReward(60)).toBe(1000);
  });

  it("cost the creator the rewards plus the fee", () => {
    expect(surveyCost(200, 50)).toBe(11_000);
    expect(surveyCost(3, 7)).toBe(24);
  });
});

describe("answers", () => {
  it("list the required questions still unanswered", () => {
    expect(missingAnswers(questions, { q1: "Yes" }).map((q) => q.id)).toEqual([
      "q3",
    ]);
    expect(missingAnswers(questions, { q1: "", q3: 1 })).toHaveLength(1);
    expect(missingAnswers(questions, { q1: "No", q3: 1 })).toHaveLength(0);
  });

  it("are summarised by option and by average", () => {
    const [first, second, third] = questions as [
      SurveyQuestion,
      SurveyQuestion,
      SurveyQuestion,
    ];
    expect(questionSummary(first, results)).toEqual({
      answered: 2,
      options: [
        { count: 1, option: "Yes" },
        { count: 1, option: "No" },
      ],
    });
    expect(questionSummary(second, results).answered).toBe(1);
    expect(questionSummary(third, results)).toEqual({
      answered: 2,
      average: 3,
    });
  });
});

describe("exports", () => {
  const rows = resultRows(questions, results);

  it("have a header and one row per response", () => {
    expect(rows[0]).toEqual([
      "response",
      "submitted_at",
      "counted",
      "Do you rent games?",
      'Which, "if any"?',
      "How much?",
    ]);
    expect(rows[1]).toEqual([
      "1",
      "2026-10-01T10:00:00Z",
      "1",
      "Yes",
      "Music; Games",
      "4",
    ]);
    expect(rows[2]?.[4]).toBe("");
  });

  it("quote CSV cells and start with a byte-order mark", () => {
    const csv = toCsv(rows);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Which, ""if any""?"');
  });

  it("escape the Excel XML", () => {
    expect(toExcel([["<b>&"]])).toContain("&lt;b&gt;&amp;");
  });

  it("label SPSS variables with the questions", () => {
    const syntax = toSpssSyntax(questions);
    expect(syntax).toContain("q3 A500");
    expect(syntax).toContain(`q2 "Which, 'if any'?"`);
  });
});

describe("survey errors", () => {
  it("map the database's messages", () => {
    expect(surveyError("You already answered this survey")).toBe("answered");
    expect(surveyError("Not enough Bulbs for the rewards")).toBe("bulbs");
    expect(surveyError("something else")).toBe("failed");
    expect(surveyError(undefined)).toBe("failed");
  });
});
