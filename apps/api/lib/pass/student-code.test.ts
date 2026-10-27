import { describe, expect, it } from "vitest";
import { studentCodeError } from "./student-code";

describe("studentCodeError", () => {
  it("maps the database's messages", () => {
    expect(studentCodeError("Use your university email")).toBe(
      "not_university"
    );
    expect(studentCodeError("This email already verified another Pass")).toBe(
      "email_taken"
    );
    expect(studentCodeError("Too many codes today")).toBe("too_many");
    expect(studentCodeError(undefined)).toBe("failed");
  });
});
