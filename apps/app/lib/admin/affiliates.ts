import { Constants, type Enums } from "@repo/database";
import type { Tone } from "@/components/admin/status-badge";

export type AffiliateStatus = Enums<"affiliate_status">;

export const affiliateStatuses = Constants.public.Enums.affiliate_status;

/** The list's filter: one status (applications first) or everything. */
export const affiliateViews = [...affiliateStatuses, "all"] as const;

export const affiliateStatusTone: Record<AffiliateStatus, Tone> = {
  applied: "brand",
  approved: "success",
  rejected: "neutral",
  suspended: "danger",
};

/** The smallest payout, in IQD (`record_affiliate_payout`). */
export const AFFILIATE_MIN_PAYOUT = 25_000;

/** A code as stored: 4 to 20 upper-case letters and digits. */
export const AFFILIATE_CODE = /^[A-Z0-9]{4,20}$/;

/**
 * A code to suggest on approval: the first name in capitals, letters and
 * digits only, padded to at least 4 characters.
 */
export const suggestCode = (name: string | null | undefined) => {
  const base = (name ?? "")
    .split(" ")[0]
    .normalize("NFKD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);
  return base.length >= 4 ? base : `${base}IDEA`.slice(0, 16);
};
