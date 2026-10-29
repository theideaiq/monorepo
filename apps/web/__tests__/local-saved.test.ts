import { beforeEach, describe, expect, test } from "vitest";
import {
  clearLocalSaved,
  localSaved,
  toggleLocalSaved,
} from "@/lib/local-saved";

describe("hearts saved in the browser", () => {
  beforeEach(() => localStorage.clear());

  test("toggles a product and clears after sign-in", () => {
    toggleLocalSaved("a");
    toggleLocalSaved("b");
    expect(localSaved()).toEqual(["a", "b"]);
    toggleLocalSaved("a");
    expect(localSaved()).toEqual(["b"]);
    clearLocalSaved();
    expect(localSaved()).toEqual([]);
  });

  test("ignores what isn't a list of ids", () => {
    localStorage.setItem("the-idea:saved", "{oops");
    expect(localSaved()).toEqual([]);
    localStorage.setItem("the-idea:saved", JSON.stringify(["a", 3, null]));
    expect(localSaved()).toEqual(["a"]);
  });
});
