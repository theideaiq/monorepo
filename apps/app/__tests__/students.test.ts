import { describe, expect, it } from "vitest";
import { confirmError, studentChoice, studentCodeError } from "@/lib/students";

describe("the student price", () => {
  const glow = { amount: 14_750, id: "plus-glow" };
  const student = {
    amount: 11_750,
    id: "plus-glow-student",
    student_of: "plus-glow",
  };

  it("is offered to verified students", () => {
    expect(studentChoice(glow, [student], true).plan).toBe(student);
    expect(studentChoice(glow, [student], false).plan).toBe(glow);
    expect(studentChoice(glow, [student], false).ids).toEqual([
      "plus-glow",
      "plus-glow-student",
    ]);
    expect(studentChoice(glow, null, true).plan).toBe(glow);
  });
});

describe("student verification errors", () => {
  it("map to messages", () => {
    expect(studentCodeError("not_university")).toBe("not_university");
    expect(studentCodeError("something else")).toBe("failed");
    expect(confirmError("Wrong code")).toBe("wrongCode");
    expect(confirmError("The code has expired")).toBe("expiredCode");
    expect(confirmError(undefined)).toBe("failed");
  });
});
