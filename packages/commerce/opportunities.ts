type Funding = string | null;

/** Funding that means taking part may well cost something. */
const COST_LIKELY: readonly Funding[] = ["fee_charging", "self_funded"];

/**
 * What an opportunity's cost line shows: its price, "Free", or nothing
 * beyond the note. A fee of 0 is the organization's own word that applying is
 * free, unless the funding says otherwise; on a listing catalogued from
 * outside (with a source or check date), no one entered it, so unknown funding
 * says nothing about the cost.
 */
export const opportunityCost = ({
  applicant_fee: fee,
  funding_type: funding,
  last_checked_on: lastChecked,
  source_url: source,
}: {
  readonly applicant_fee: number;
  readonly funding_type: Funding;
  readonly last_checked_on: string | null;
  readonly source_url: string | null;
}): "free" | "price" | "unstated" => {
  if (fee > 0) {
    return "price";
  }
  if (COST_LIKELY.includes(funding)) {
    return "unstated";
  }
  return funding === "unknown" && (source || lastChecked) ? "unstated" : "free";
};

/**
 * Whether an opportunity with no deadline should send people to its source:
 * one catalogued from outside, where no date means none was stated, rather
 * than that it stays open until filled.
 */
export const datesAtSource = ({
  deadline,
  last_checked_on: lastChecked,
  source_url: source,
}: {
  readonly deadline: string | null;
  readonly last_checked_on: string | null;
  readonly source_url: string | null;
}) => !deadline && Boolean(source || lastChecked);
