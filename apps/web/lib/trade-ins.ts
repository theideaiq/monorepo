import { isIraqiMobile, normalizePhone } from "@repo/auth/phone";
import {
  Constants,
  type TradeInCategory,
  type TradeInCondition,
  type TradeInPayout,
  type TradeInStatus,
} from "@repo/database";
import { checkFile } from "@repo/storage";

/**
 * "Sell to us": the rules of a trade-in request, shared by the customer
 * form (Your Pass) and its tests. The database checks the same things
 * (migration 20261120000300_trade_ins.sql).
 */

export const tradeInCategories = Constants.public.Enums.trade_in_category;
export const tradeInConditions = Constants.public.Enums.trade_in_condition;
export const tradeInPayouts = Constants.public.Enums.trade_in_payout;
export const tradeInStatuses = Constants.public.Enums.trade_in_status;

export const MAX_TRADE_IN_PHOTOS = 6;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_ASKING_PRICE = 1_000_000_000;

export interface TradeInDraft {
  askingPrice: string;
  category: TradeInCategory;
  condition: TradeInCondition;
  description: string;
  payout: TradeInPayout;
  phone: string;
  photos: File[];
  title: string;
}

export type TradeInProblem =
  | "askingPrice"
  | "phone"
  | "photoTooLarge"
  | "photoType"
  | "tooManyPhotos"
  | "title";

export const emptyTradeInDraft = (phone = ""): TradeInDraft => ({
  askingPrice: "",
  category: "vinyl",
  condition: "good",
  description: "",
  payout: "cash",
  phone,
  photos: [],
  title: "",
});

const DIGITS_ONLY = /^\d+$/;
const GROUPING = /[,\s،٬]/g;

/** The asking price in IQD: null when empty, NaN when not a whole number. */
export const parseAskingPrice = (value: string): number | null => {
  const cleaned = value.replace(GROUPING, "").trim();
  if (!cleaned) {
    return null;
  }
  return DIGITS_ONLY.test(cleaned) ? Number(cleaned) : Number.NaN;
};

/** The contact number in E.164 when it is an Iraqi mobile, else null. */
export const contactPhone = (value: string) => {
  const e164 = normalizePhone(value);
  return e164 && isIraqiMobile(e164) ? e164 : null;
};

/** The first problem with a draft, or null when it can be sent. */
export const validateTradeIn = (draft: TradeInDraft): TradeInProblem | null => {
  if (!draft.title.trim()) {
    return "title";
  }
  const price = parseAskingPrice(draft.askingPrice);
  if (
    price !== null &&
    !(Number.isSafeInteger(price) && price <= MAX_ASKING_PRICE)
  ) {
    return "askingPrice";
  }
  if (!contactPhone(draft.phone)) {
    return "phone";
  }
  if (draft.photos.length > MAX_TRADE_IN_PHOTOS) {
    return "tooManyPhotos";
  }
  for (const photo of draft.photos) {
    const problem = checkFile("tradeIns", photo);
    if (problem === "too_large") {
      return "photoTooLarge";
    }
    if (problem) {
      return "photoType";
    }
  }
  return null;
};

/** The customer answers an offer while it is open. */
export const canRespond = (status: TradeInStatus) => status === "offer_made";

/** The customer withdraws a request that isn't settled yet. */
export const canWithdrawTradeIn = (status: TradeInStatus) =>
  status === "submitted" ||
  status === "reviewing" ||
  status === "offer_made" ||
  status === "declined";
