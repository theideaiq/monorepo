/** Postgres error codes returned by Supabase for our tables and RPCs. */
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const STRING_TOO_LONG = "22001";
const NO_DATA_FOUND = "P0002";
const INSUFFICIENT_PRIVILEGE = "42501";

const codeOf = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;

const messageOf = (error: unknown) =>
  typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : "";

/** The code of an `ApiError` thrown by callApi (checked by name). */
const apiCodeOf = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "name" in error &&
  error.name === "ApiError" &&
  "code" in error
    ? String(error.code)
    : undefined;

export type OrganizationError = "slugInvalid" | "slugTaken" | "unknown";

/** Creating or renaming an organization (unique, valid slug). */
export const toOrganizationError = (error: unknown): OrganizationError => {
  switch (codeOf(error)) {
    case UNIQUE_VIOLATION:
      return "slugTaken";
    case CHECK_VIOLATION:
    case STRING_TOO_LONG:
      return "slugInvalid";
    default:
      return "unknown";
  }
};

export type InvitationError = "expired" | "unknown" | "wrongAccount";

/** accept_invitation(): expired/used, or addressed to someone else. */
export const toInvitationError = (error: unknown): InvitationError => {
  switch (codeOf(error)) {
    case NO_DATA_FOUND:
      return "expired";
    case INSUFFICIENT_PRIVILEGE:
      return "wrongAccount";
    default:
      return "unknown";
  }
};

export type CheckoutError =
  | "cartEmpty"
  | "cashUnavailable"
  | "guardianRequired"
  | "needsBirthday"
  | "notForMinors"
  | "invalidAddress"
  | "notEnoughBulbs"
  | "notPayable"
  | "outOfStock"
  | "payment"
  | "pickupUnavailable"
  | "rentedOut"
  | "suspended"
  | "unavailable"
  | "unknown"
  | "zoneUnavailable";

/**
 * create_order() and POST /orders/checkout failures. The RPC raises fixed
 * messages (see the commerce migration); the API answers with codes.
 */
export const toCheckoutError = (error: unknown): CheckoutError => {
  const apiCode = apiCodeOf(error);
  if (apiCode === "order_not_payable") {
    return "notPayable";
  }
  if (apiCode) {
    return "payment";
  }

  const message = messageOf(error);
  if (message.includes("Cart is empty")) {
    return "cartEmpty";
  }
  if (message.includes("Not enough Bulbs")) {
    return "notEnoughBulbs";
  }
  if (message.includes("Not enough stock")) {
    return "outOfStock";
  }
  if (message.includes("no longer available")) {
    return "unavailable";
  }
  if (message.includes("Invalid shipping address")) {
    return "invalidAddress";
  }
  if (message.includes("Account suspended")) {
    return "suspended";
  }
  if (message.includes("Delivery zone not available")) {
    return "zoneUnavailable";
  }
  if (message.includes("Store pickup is not available")) {
    return "pickupUnavailable";
  }
  if (message.includes("Cash payment is not available")) {
    return "cashUnavailable";
  }
  if (message.includes("A guardian must approve")) {
    return "guardianRequired";
  }
  if (message.includes("Add your date of birth")) {
    return "needsBirthday";
  }
  if (message.includes("Not available under 18")) {
    return "notForMinors";
  }
  if (
    message.includes("All copies are rented out") ||
    message.includes("Item not available")
  ) {
    return "rentedOut";
  }
  return "unknown";
};

export type RentalError =
  | "needsTier"
  | "noSlots"
  | "notCancellable"
  | "suspended"
  | "unavailable"
  | "unknown";

/** request_rental() and cancel_rental() failures. */
export const toRentalError = (error: unknown): RentalError => {
  const message = messageOf(error);
  if (message.includes("No free rental slots")) {
    return "noSlots";
  }
  if (message.includes("needs a higher plan")) {
    return "needsTier";
  }
  if (
    message.includes("All copies are rented out") ||
    message.includes("Item not available")
  ) {
    return "unavailable";
  }
  if (message.includes("already delivered")) {
    return "notCancellable";
  }
  if (message.includes("Account suspended")) {
    return "suspended";
  }
  return "unknown";
};

export type RsvpError = "closed" | "full" | "unknown";

/** RSVPs refused by the check_rsvp trigger. */
export const toRsvpError = (error: unknown): RsvpError => {
  const message = messageOf(error);
  if (message.includes("is full")) {
    return "full";
  }
  if (message.includes("not open for RSVPs")) {
    return "closed";
  }
  return "unknown";
};

/** A unique violation: the row (an RSVP, a cart line) already exists. */
export const isDuplicate = (error: unknown) =>
  codeOf(error) === UNIQUE_VIOLATION;

export type SupportError = "closed" | "orderNotFound" | "unknown";

/** create_support_ticket(), replies and close_support_ticket() failures. */
export const toSupportError = (error: unknown): SupportError => {
  const message = messageOf(error);
  if (
    message.includes("ticket is closed") ||
    message.includes("already closed")
  ) {
    return "closed";
  }
  if (message.includes("Order not found")) {
    return "orderNotFound";
  }
  return "unknown";
};

export type ReviewError = "duplicate" | "suspended" | "unknown";

/** Writing a review: one per product, none from suspended accounts. */
export const toReviewError = (error: unknown): ReviewError => {
  if (codeOf(error) === UNIQUE_VIOLATION) {
    return "duplicate";
  }
  if (messageOf(error).includes("Account suspended")) {
    return "suspended";
  }
  return "unknown";
};

export type AgeError = "adultsOnly" | "guardianRequired" | "needsBirthday";

/**
 * The age rules' refusals (the ages migration and POST /checkout): 18+
 * actions, a missing date of birth, a teen without their guardian's yes.
 */
export const toAgeError = (error: unknown): AgeError | null => {
  if (apiCodeOf(error) === "guardian_required") {
    return "guardianRequired";
  }
  const message = messageOf(error);
  if (message.includes("18 or over")) {
    return "adultsOnly";
  }
  if (message.includes("Add your date of birth")) {
    return "needsBirthday";
  }
  return null;
};
