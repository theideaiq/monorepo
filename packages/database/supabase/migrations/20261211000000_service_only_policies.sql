-- Service-only tables say so with a policy.
--
-- These tables have Row Level Security on and, until now, no policy at all:
-- no client role could reach them (the service role bypasses RLS, and
-- SECURITY DEFINER functions run as the owner), but the Supabase advisor
-- reports every such table (lint 0008, "RLS enabled, no policy"). An
-- explicit restrictive policy that refuses anon and authenticated keeps the
-- same access and states the intent, so the advisor stays at zero.

create policy "No client access"
  on public.webhook_events as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "No client access"
  on private.pass_secrets as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "No client access"
  on private.newsletter_contacts as restrictive for all to anon, authenticated
  using (false) with check (false);

-- Retired back-office tables (migration 20261120000000), kept for the record.
create policy "No client access"
  on archive.equity_holders as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "No client access"
  on archive.equity_rounds as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "No client access"
  on archive.fixed_assets as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "No client access"
  on archive.marketing_campaigns as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "No client access"
  on archive.marketing_segments as restrictive for all to anon, authenticated
  using (false) with check (false);

create policy "No client access"
  on archive.staff_plan as restrictive for all to anon, authenticated
  using (false) with check (false);
