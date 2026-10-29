/** Who a perk is open to (`perks.audience`). */
export type PerkAudience = "everyone" | "plus" | "students";

/** The student price of a plan, when it has one (`plans.student_of`). */
export const studentPlanFor = <T extends { student_of: string | null }>(
  studentPlans: readonly T[] | null | undefined,
  planId: string
) => studentPlans?.find((plan) => plan.student_of === planId);

/**
 * The plan shown for a listed one: its student price for a verified
 * student, else the plan itself; `ids` are both, for "your plan".
 */
export const studentChoice = <
  L extends { id: string },
  S extends { id: string; student_of: string | null },
>(
  listed: L,
  studentPlans: readonly S[] | null | undefined,
  isStudent: boolean
) => {
  const studentPlan = studentPlanFor(studentPlans, listed.id);
  return {
    ids: [listed.id, studentPlan?.id],
    plan: isStudent && studentPlan ? studentPlan : listed,
    studentPlan,
  };
};

/** The errors the student code request can return, as message keys. */
const CODE_ERRORS = [
  "email_taken",
  "email_unavailable",
  "not_university",
  "too_many",
] as const;

export type StudentCodeError = (typeof CODE_ERRORS)[number] | "failed";

export const studentCodeError = (code: string | undefined): StudentCodeError =>
  (CODE_ERRORS as readonly string[]).includes(code ?? "")
    ? (code as StudentCodeError)
    : "failed";

/** The confirm step's database messages, as message keys. */
export const confirmError = (message: string | undefined) => {
  if (message?.includes("Wrong code")) {
    return "wrongCode" as const;
  }
  if (message?.includes("expired")) {
    return "expiredCode" as const;
  }
  return "failed" as const;
};
