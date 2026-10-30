import { describe, expect, test } from "vitest";
import { databaseError, errorFields, failure } from "./action-state";

describe("databaseError", () => {
  test("publishing a product without a picture says so", () => {
    // The products trigger raises check_violation with this text.
    const key = databaseError({
      code: "23514",
      message: "Add a picture before publishing",
    });
    expect(key).toBe("needsPicture");
    expect(failure(key, errorFields[key])).toEqual({
      error: "needsPicture",
      fields: ["status", "images"],
      status: "error",
    });
  });

  test("other check violations stay invalid", () => {
    expect(databaseError({ code: "23514", message: "new row violates" })).toBe(
      "invalid"
    );
    expect(databaseError({ code: "23505" })).toBe("duplicate");
  });
});
