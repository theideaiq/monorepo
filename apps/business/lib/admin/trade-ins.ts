import { Constants, type TradeInStatus } from "@repo/database";
import { z } from "zod";
import type { Tone } from "@/components/admin/status-badge";
import { checkbox, int, optionalText, uuid } from "./forms";

export const tradeInStatuses = Constants.public.Enums.trade_in_status;
export const tradeInCategories = Constants.public.Enums.trade_in_category;

/**
 * The queue's status filter: "open" (waiting on staff: submitted,
 * reviewing, declined and accepted), "waiting" (an offer the customer
 * hasn't answered), one status, or everything.
 */
export const tradeInViews = [
  "open",
  "waiting",
  ...tradeInStatuses,
  "all",
] as const;
export type TradeInView = (typeof tradeInViews)[number];

export const statusesForView = (view: TradeInView): TradeInStatus[] | null => {
  switch (view) {
    case "all":
      return null;
    case "open":
      return ["submitted", "reviewing", "declined", "accepted"];
    case "waiting":
      return ["offer_made"];
    default:
      return [view];
  }
};

export const tradeInStatusTone: Record<TradeInStatus, Tone> = {
  accepted: "success",
  completed: "neutral",
  declined: "warning",
  offer_made: "info",
  rejected: "danger",
  reviewing: "info",
  submitted: "warning",
  withdrawn: "neutral",
};

/**
 * What staff can do next from each status (the database allows the same
 * moves, migration 20261120000300_trade_ins.sql): mark as reviewing, make or
 * revise an offer, reject, or complete an accepted trade.
 */
export const staffMoves = (status: TradeInStatus) => ({
  canComplete: status === "accepted",
  canOffer:
    status === "submitted" ||
    status === "reviewing" ||
    status === "offer_made" ||
    status === "declined",
  canReject:
    status === "submitted" ||
    status === "reviewing" ||
    status === "offer_made" ||
    status === "declined" ||
    status === "accepted",
  canReview: status === "submitted" || status === "offer_made",
});

const TRADE_IN_NUMBER = /^#?\s*(\d{1,12})$/;

/** "#5001" or "5001" finds a request by number; anything else searches titles. */
export const parseTradeInSearch = (
  value: string
): { number: number } | { title: string } | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const match = TRADE_IN_NUMBER.exec(trimmed);
  return match ? { number: Number(match[1]) } : { title: trimmed };
};

/** Make (or revise) an offer: amount in IQD and a note the customer sees. */
export const offerSchema = z.object({
  amount: int(0, 1_000_000_000),
  note: optionalText(2000),
  tradeInId: uuid,
});

/** Reject a request, with an optional reason the customer sees. */
export const rejectSchema = z.object({
  note: optionalText(2000),
  tradeInId: uuid,
});

export const reviewSchema = z.object({ tradeInId: uuid });

/** Complete an accepted trade, optionally creating a draft product. */
export const completeSchema = z.object({
  createProduct: checkbox,
  tradeInId: uuid,
});
