/**
 * Journal-entry lines as typed in the "new entry" form. Amounts are whole
 * IQD. The database (`post_journal_entry`) checks the balance again; this
 * gives the form immediate feedback and cleans the lines before posting.
 */
export interface JournalLineInput {
  accountId: string;
  credit: number;
  debit: number;
  /** Report tags, e.g. {"product_line": "plus"}. */
  dimensions?: Record<string, string>;
  memo?: string | null;
}

export type JournalProblem =
  | "tooFewLines"
  | "oneSidePerLine"
  | "missingAccount"
  | "negativeAmount"
  | "unbalanced"
  | "zeroTotal";

export const journalTotals = (lines: JournalLineInput[]) => {
  const debit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const credit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);
  return {
    balanced: debit === credit && debit > 0,
    credit,
    debit,
    difference: debit - credit,
  };
};

const isBlank = (line: JournalLineInput) =>
  !(line.accountId || line.debit || line.credit || line.memo);

/**
 * Drops empty rows and checks the rest: at least two lines, each with an
 * account and exactly one positive side, and debits equal to credits.
 */
export const validateJournalLines = (
  lines: JournalLineInput[]
):
  | { lines: JournalLineInput[]; ok: true }
  | { ok: false; problem: JournalProblem } => {
  const filled = lines.filter((line) => !isBlank(line));

  if (filled.length < 2) {
    return { ok: false, problem: "tooFewLines" };
  }

  for (const line of filled) {
    if (!line.accountId) {
      return { ok: false, problem: "missingAccount" };
    }
    if (
      line.debit < 0 ||
      line.credit < 0 ||
      !Number.isSafeInteger(line.debit) ||
      !Number.isSafeInteger(line.credit)
    ) {
      return { ok: false, problem: "negativeAmount" };
    }
    if (line.debit > 0 === line.credit > 0) {
      return { ok: false, problem: "oneSidePerLine" };
    }
  }

  const totals = journalTotals(filled);
  if (totals.debit === 0) {
    return { ok: false, problem: "zeroTotal" };
  }
  if (!totals.balanced) {
    return { ok: false, problem: "unbalanced" };
  }

  return {
    lines: filled.map((line) => ({
      ...line,
      memo: line.memo?.trim() || null,
    })),
    ok: true,
  };
};

/** The `lines` argument of `post_journal_entry`. */
export const toRpcLines = (lines: JournalLineInput[]) =>
  lines.map((line) => ({
    account_id: line.accountId,
    credit: line.credit,
    debit: line.debit,
    dimensions: line.dimensions ?? {},
    memo: line.memo ?? "",
  }));
