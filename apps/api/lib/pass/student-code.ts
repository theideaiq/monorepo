/** What a failed `issue_student_code()` means for the website. */
export type StudentCodeError =
  | "email_taken"
  | "not_university"
  | "too_many"
  | "failed";

const ERRORS: [string, StudentCodeError][] = [
  ["Use your university email", "not_university"],
  ["already verified another Pass", "email_taken"],
  ["Too many codes today", "too_many"],
];

/** Maps the database's message to an error the website translates. */
export const studentCodeError = (message: string | undefined) =>
  ERRORS.find(([text]) => message?.includes(text))?.[1] ?? "failed";
