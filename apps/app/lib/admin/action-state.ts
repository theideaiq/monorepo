/**
 * What a Server Action returns to its form. Errors and messages are keys
 * under `admin.errors` / `admin.notices` in the messages files.
 */
export type ActionError =
  | "unauthorized"
  | "forbidden"
  | "invalid"
  | "duplicate"
  | "notFound"
  | "unbalanced"
  | "transition"
  | "inUse"
  | "lastSuperadmin"
  | "lastVariant"
  | "chooseVariant"
  | "variantPricing"
  | "apiUnavailable"
  | "unknown";

export type ActionNotice = "saved" | "deleted" | "sent" | "posted";

export type ActionState =
  | { status: "idle" }
  | {
      /** Where the form navigates next (a path without the locale). */
      redirectTo?: string;
      status: "success";
      notice: ActionNotice;
      /** Extra data for the form, e.g. a lookup result. */
      data?: Record<string, unknown>;
    }
  | { error: ActionError; fields?: string[]; status: "error" };

export const idle: ActionState = { status: "idle" };

export const success = (
  notice: ActionNotice = "saved",
  extra: { data?: Record<string, unknown>; redirectTo?: string } = {}
): ActionState => ({ notice, status: "success", ...extra });

export const failure = (
  error: ActionError,
  fields?: string[]
): ActionState => ({
  error,
  fields,
  status: "error",
});

interface DatabaseError {
  code?: string;
  message?: string;
}

/** Maps a Postgres/PostgREST error to a message key. */
export const databaseError = (error: DatabaseError): ActionError => {
  const message = error.message ?? "";
  if (message.includes("balance")) {
    return "unbalanced";
  }
  if (message.includes("can't change from") || message.includes("can’t")) {
    return "transition";
  }
  if (message.includes("at least one superadmin")) {
    return "lastSuperadmin";
  }
  if (message.includes("at least one variant")) {
    return "lastVariant";
  }
  if (message.includes("Choose a variant")) {
    return "chooseVariant";
  }
  if (message.includes("set its price and stock on each variant")) {
    return "variantPricing";
  }
  switch (error.code) {
    case "23505":
      return "duplicate";
    case "23503":
      return "inUse";
    case "23514":
    case "22P02":
    case "22023":
      return "invalid";
    case "42501":
      return "forbidden";
    case "PGRST116":
    case "P0002":
      return "notFound";
    default:
      return "unknown";
  }
};
