import { describe, expect, test } from "vitest";
import { criteriaFromForm, parseCriteria } from "./segments";

describe("segment criteria", () => {
  test("form → criteria, dropping 'any'", () => {
    expect(
      criteriaFromForm({
        crmStatus: ["vip", "vip", "customer", "bogus"],
        locale: "any",
        plusMember: "yes",
        tags: ["gamer"],
      })
    ).toEqual({
      crm_status: ["vip", "customer"],
      plus_member: true,
      tags: ["gamer"],
    });

    expect(criteriaFromForm({ locale: "en", plusMember: "no" })).toEqual({
      locale: "en",
      plus_member: false,
    });
    expect(criteriaFromForm({})).toEqual({});
  });

  test("parses stored criteria and ignores malformed ones", () => {
    expect(parseCriteria({ crm_status: ["lead"], locale: "ar" })).toEqual({
      crm_status: ["lead"],
      locale: "ar",
    });
    expect(parseCriteria({ crm_status: "lead" })).toEqual({});
    expect(parseCriteria({ unknown: true })).toEqual({});
    expect(parseCriteria(null)).toEqual({});
  });
});
