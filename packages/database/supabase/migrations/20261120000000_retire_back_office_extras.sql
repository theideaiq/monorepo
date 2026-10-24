-- Retires parts of the back office (decision of 2026-10-24, PROGRESS.md):
--
-- 1. Finance extras: the payroll plan (staff_plan), the cap table
--    (equity_rounds, equity_holders) and fixed assets (fixed_assets,
--    fixed_asset_schedule()). The double-entry ledger, its scenarios and
--    financial_settings stay.
-- 2. Our own email campaigns (marketing_campaigns, marketing_segments).
--    Newsletters are sent from Resend Broadcasts instead; apps/api's
--    /cron/newsletter-contacts keeps a Resend segment in step with
--    profiles.marketing_opt_in (section 3 below). The CRM stays.
--
-- No data is dropped: the retired tables and their enums move to the
-- schema `archive`, which no client role can reach (only the database owner
-- reads it, e.g. from the SQL editor). Their policies and triggers go, and
-- so does the function that read them.

-- ── 1. The archive schema ──────────────────────────────────────────────────

create schema archive;

comment on schema archive is
  'Retired tables, kept for their data. Not exposed to the API; no client role has access.';

revoke all on schema archive from public, anon, authenticated, service_role;

-- ── 2. Retire the tables ───────────────────────────────────────────────────

-- The depreciation schedule reads fixed_assets: the public wrapper and its
-- private body (20261110000000_hardening.sql) go.
drop function public.fixed_asset_schedule(date);
drop function private.fixed_asset_schedule(date);

-- Audit and updated_at triggers: nothing edits these rows any more.
drop trigger audit_marketing_campaigns on public.marketing_campaigns;
drop trigger audit_staff_plan on public.staff_plan;
drop trigger audit_equity_holders on public.equity_holders;
drop trigger audit_fixed_assets on public.fixed_assets;
drop trigger set_updated_at on public.marketing_campaigns;
drop trigger set_updated_at on public.staff_plan;
drop trigger set_updated_at on public.fixed_assets;

-- Policies (20261101000400_back_office.sql, 20261107000100_finance_extras.sql).
-- Row Level Security stays enabled, so without policies only the owner
-- sees the rows.
drop policy "Marketing manages segments" on public.marketing_segments;
drop policy "Marketing sees campaigns" on public.marketing_campaigns;
drop policy "Marketing creates drafts" on public.marketing_campaigns;
drop policy "Marketing edits drafts" on public.marketing_campaigns;
drop policy "Marketing deletes drafts" on public.marketing_campaigns;
drop policy "Finance manages the staff plan" on public.staff_plan;
drop policy "Finance manages equity rounds" on public.equity_rounds;
drop policy "Finance manages equity holders" on public.equity_holders;
drop policy "Finance manages fixed assets" on public.fixed_assets;

revoke all on public.marketing_segments, public.marketing_campaigns,
  public.staff_plan, public.equity_rounds, public.equity_holders,
  public.fixed_assets
  from public, anon, authenticated, service_role;

-- Tables keep their rows, indexes and constraints (the foreign keys between
-- them move along; created_by still points at auth.users).
alter table public.marketing_segments set schema archive;
alter table public.marketing_campaigns set schema archive;
alter table public.staff_plan set schema archive;
alter table public.equity_rounds set schema archive;
alter table public.equity_holders set schema archive;
alter table public.fixed_assets set schema archive;

-- Enums only these tables use.
alter type public.campaign_status set schema archive;
alter type public.staff_plan_status set schema archive;
alter type public.equity_holder_type set schema archive;
alter type public.equity_instrument set schema archive;

revoke all on type archive.campaign_status, archive.staff_plan_status,
  archive.equity_holder_type, archive.equity_instrument
  from public;

-- ── 3. Newsletter contacts (Resend) ────────────────────────────────────────
-- apps/api pushes every account with an email to a Resend segment
-- (`unsubscribed` = not opted in, or suspended) and pulls unsubscribes made
-- in Resend back into profiles.marketing_opt_in. When the two disagree (the
-- profile opted in, Resend says unsubscribed), the newer change wins: the
-- profile's opt-in if it changed after the contact was last pushed,
-- otherwise Resend's unsubscribe.

create table private.newsletter_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- When profiles.marketing_opt_in last changed (trigger below).
  opt_in_changed_at timestamptz,
  -- When apps/api last pushed this account to Resend.
  synced_at timestamptz
);

comment on table private.newsletter_contacts is
  'Sync bookkeeping for the Resend newsletter segment (apps/api /cron/newsletter-contacts).';

alter table private.newsletter_contacts enable row level security;
revoke all on private.newsletter_contacts from public, anon, authenticated;
grant all on private.newsletter_contacts to service_role;

-- Records when a profile's marketing consent changes, whoever changes it.
create function private.stamp_marketing_opt_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.newsletter_contacts (user_id, opt_in_changed_at)
  values (new.id, now())
  on conflict (user_id) do update set opt_in_changed_at = excluded.opt_in_changed_at;
  return null;
end;
$$;

revoke all on function private.stamp_marketing_opt_in() from public, anon, authenticated;

create trigger stamp_marketing_opt_in
  after update of marketing_opt_in on public.profiles
  for each row
  when (old.marketing_opt_in is distinct from new.marketing_opt_in)
  execute function private.stamp_marketing_opt_in();

-- Service only (apps/api): every account with an email address, with its
-- consent and sync bookkeeping, ordered by user id for paging.
create function public.newsletter_audience()
returns table (
  user_id uuid,
  email text,
  full_name text,
  marketing_opt_in boolean,
  suspended boolean,
  opt_in_changed_at timestamptz,
  synced_at timestamptz
)
language sql stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    lower(account.email)::text,
    profile.full_name,
    profile.marketing_opt_in,
    profile.banned_at is not null,
    contact.opt_in_changed_at,
    contact.synced_at
  from public.profiles as profile
  join auth.users as account on account.id = profile.id
  left join private.newsletter_contacts as contact on contact.user_id = profile.id
  where account.email is not null and account.email <> ''
  order by profile.id;
$$;

-- Service only (apps/api): marks accounts as pushed to Resend now.
create function public.mark_newsletter_synced(user_ids uuid[])
returns void
language sql volatile
security definer
set search_path = ''
as $$
  insert into private.newsletter_contacts (user_id, synced_at)
  select profile.id, now()
  from public.profiles as profile
  where profile.id = any (user_ids)
  on conflict (user_id) do update set synced_at = excluded.synced_at;
$$;

revoke all on function public.newsletter_audience() from public, anon, authenticated;
revoke all on function public.mark_newsletter_synced(uuid[]) from public, anon, authenticated;
grant execute on function public.newsletter_audience() to service_role;
grant execute on function public.mark_newsletter_synced(uuid[]) to service_role;
