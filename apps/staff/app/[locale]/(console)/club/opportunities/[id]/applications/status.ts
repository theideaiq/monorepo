export type ApplicationStatus =
  | "accepted"
  | "cancelled"
  | "completed"
  | "confirmed"
  | "refused"
  | "submitted"
  | "waitlisted"
  | "withdrawn";

/** A minor's guardian decision worth showing beside the status. */
export const guardianNote = (status: string | null) =>
  status === "pending" || status === "declined" ? status : null;

/**
 * How an editor can end a place in each status; `overdue` when an
 * installment is past its date.
 */
export const endOutcomes = (status: ApplicationStatus, overdue: boolean) => {
  if (status === "confirmed") {
    return overdue
      ? (["completed", "unpaid", "visa_refused", "the_idea"] as const)
      : (["completed", "visa_refused", "the_idea"] as const);
  }
  if (status === "accepted") {
    return overdue
      ? (["unpaid", "visa_refused", "the_idea"] as const)
      : (["visa_refused", "the_idea"] as const);
  }
  if (status === "submitted" || status === "waitlisted") {
    return ["the_idea"] as const;
  }
  return [] as const;
};

/** Whether any installment is unpaid past its date (YYYY-MM-DD, Baghdad). */
export const hasOverdue = (
  payments: readonly { due_on: string; paid_at: string | null }[],
  today: string
) =>
  payments.some(
    (payment) => !payment.paid_at && payment.due_on.localeCompare(today) < 0
  );
