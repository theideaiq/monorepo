/**
 * Database types, safe to import from client and server code. The privileged
 * client lives in `@repo/database/admin` (server-only).
 */
export {
  Constants,
  type Database,
  type Enums,
  type Json,
  type Tables,
  type TablesInsert,
  type TablesUpdate,
} from "./types";

export type OrgRole = import("./types").Enums<"org_role">;
export type PaymentStatus = import("./types").Enums<"payment_status">;
export type SubscriptionStatus = import("./types").Enums<"subscription_status">;
export type StaffRole = import("./types").Enums<"staff_role">;
export type OrderStatus = import("./types").Enums<"order_status">;
export type OrderFulfilment = import("./types").Enums<"order_fulfilment">;
export type OrderPaymentMethod =
  import("./types").Enums<"order_payment_method">;
export type RentalStatus = import("./types").Enums<"rental_status">;
export type ProductKind = import("./types").Enums<"product_kind">;
export type SubmissionStatus = import("./types").Enums<"submission_status">;
export type SubmissionType = import("./types").Enums<"submission_type">;
