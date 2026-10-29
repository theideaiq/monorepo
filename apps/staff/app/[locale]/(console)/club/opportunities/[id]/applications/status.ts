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

/** How an editor can end a place in each status. */
export const endOutcomes = (status: ApplicationStatus, overdue: boolean) => {
  if (status === "confirmed") {
    return ["completed", "visa_refused", "the_idea"] as const;
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
