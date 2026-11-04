import { describe, expect, test } from "vitest";
import { commissionRows } from "./finance";

const games = "5f000000-0000-4000-8000-000000000001";
const music = "5f000000-0000-4000-8000-000000000002";

describe("commission rates from the form", () => {
  test("reads each category's standard and Pro percent", () => {
    expect(
      commissionRows({
        [`pro.${games}`]: "8",
        [`pro.${music}`]: "10",
        [`standard.${games}`]: "10",
        [`standard.${music}`]: "12.5",
        $ACTION_ID: "ignored",
      })
    ).toEqual([
      { category: games, pro: 8, standard: 10 },
      { category: music, pro: 10, standard: 12.5 },
    ]);
  });

  test("Pro is never above the standard rate", () => {
    expect(
      commissionRows({ [`pro.${games}`]: "11", [`standard.${games}`]: "10" })
    ).toBeNull();
  });

  test("rates stay between 0% and 50%", () => {
    expect(
      commissionRows({ [`pro.${games}`]: "8", [`standard.${games}`]: "60" })
    ).toBeNull();
    expect(commissionRows({})).toBeNull();
  });
});
