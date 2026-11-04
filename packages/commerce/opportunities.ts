type Funding = string | null;

/** Funding that leaves it unknown whether taking part costs anything. */
const COST_UNKNOWN: readonly Funding[] = [
  "fee_charging",
  "self_funded",
  "unknown",
];

/**
 * What an opportunity's cost line shows: its price, "Free", or nothing
 * beyond the note. A fee of 0 only means free when the funding doesn't leave
 * the cost open.
 */
export const opportunityCost = ({
  applicant_fee: fee,
  funding_type: funding,
}: {
  readonly applicant_fee: number;
  readonly funding_type: Funding;
}): "free" | "price" | "unstated" => {
  if (fee > 0) {
    return "price";
  }
  return COST_UNKNOWN.includes(funding) ? "unstated" : "free";
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
