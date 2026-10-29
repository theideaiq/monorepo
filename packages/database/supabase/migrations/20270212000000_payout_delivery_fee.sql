-- Payouts: a line for the original delivery fee a shop at fault pays back
-- (used by the next migration; a new enum value can't be used in the
-- transaction that adds it).

alter type public.payout_line_kind add value if not exists 'delivery_fee';
