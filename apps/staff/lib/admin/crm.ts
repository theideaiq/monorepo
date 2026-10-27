import { z } from "zod";
import { optionalDateTime, optionalText, tags, uuid } from "./forms";

/** CRM statuses (`crm_status`), in the order Staff lists them. */
export const crmStatuses = ["lead", "customer", "vip", "churned"] as const;

export const crmContactSchema = z.object({
  /** A `datetime-local` value in Baghdad time; empty clears it. */
  lastContactedAt: optionalDateTime,
  notes: optionalText(10_000),
  status: z.enum(crmStatuses),
  tags,
  userId: uuid,
});

export const markContactedSchema = z.object({ userId: uuid });

/**
 * Customer list orders: newest sign-ups (default), most recently contacted,
 * or longest since the last contact (never contacted first) for follow-ups.
 */
export const customerSorts = [
  "joined",
  "contactedRecent",
  "contactedOldest",
] as const;
export type CustomerSort = (typeof customerSorts)[number];

/**
 * Orders user ids by their CRM contact date. Customers without a contact
 * date come last when sorting by most recent, first when sorting by oldest
 * (they're the ones to call); ties keep their original order.
 */
export const orderByContact = <T extends { last_contacted_at: string | null }>(
  rows: T[],
  sort: Exclude<CustomerSort, "joined">
) =>
  rows
    .map((row, index) => ({ index, row }))
    .sort((a, b) => {
      const x = a.row.last_contacted_at;
      const y = b.row.last_contacted_at;
      if (x === y) {
        return a.index - b.index;
      }
      if (x === null) {
        return sort === "contactedOldest" ? -1 : 1;
      }
      if (y === null) {
        return sort === "contactedOldest" ? 1 : -1;
      }
      const diff = new Date(x).getTime() - new Date(y).getTime();
      return sort === "contactedOldest" ? diff : -diff;
    })
    .map(({ row }) => row);
