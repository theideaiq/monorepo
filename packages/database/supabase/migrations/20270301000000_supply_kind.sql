-- Supply: a payout line for the fees owed to supplier shops (used by the
-- next migration; a new enum value can't be used in the transaction that
-- adds it).

alter type public.payout_line_kind add value if not exists 'supply';
