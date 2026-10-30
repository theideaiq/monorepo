/** What /verify verifies, one at a time (`?kind=`). */
export const VERIFY_KINDS = [
  "student",
  "educator",
  "identity",
  "organization",
] as const;

export type VerifyKind = (typeof VERIFY_KINDS)[number];

/** The kind a `?kind=` value names; the student check by default. */
export const verifyKind = (value: string | undefined): VerifyKind =>
  VERIFY_KINDS.find((kind) => kind === value) ?? "student";
