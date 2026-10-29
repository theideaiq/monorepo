begin;
-- <preamble>
-- Shared pgTAP preamble. Each test file includes a copy between the preamble
-- markers (pg_prove runs files in isolation); `bun run --cwd
-- packages/database db:test:sync` rewrites them, `db:test` fails when stale.
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

-- Act as a signed-in user. Customers sign in with SMS (aal1); staff with an
-- authenticator app, so pass 'aal2' to act as staff. `extra` adds claims
-- (for example '{"phone":"9647700000004"}').
create function pg_temp.login_as(user_id uuid, aal text default 'aal1', extra jsonb default '{}')
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config(
    'request.jwt.claims',
    (jsonb_build_object('sub', user_id, 'role', 'authenticated', 'aal', aal) || extra)::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Act as a visitor (publishable key, no session).
create function pg_temp.login_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- Back to the superuser, to arrange fixtures or read without RLS.
create function pg_temp.reset_role()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant execute on all functions in schema pg_temp to public;
-- </preamble>

select plan(13);

-- M has Plus Shine (22,750 IQD a month) and 20,000 Bulbs; C's Plus is paid
-- by a company; X has no Plus.
truncate public.subscriptions cascade;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000ed1', 'm9zzl@example.iq'),
  ('00000000-0000-0000-0000-000000000ed2', 'c9zzl@example.iq'),
  ('00000000-0000-0000-0000-000000000ed3', 'x9zzl@example.iq');
insert into public.subscriptions (id, user_id, plan_id, provider, status, current_period_start, current_period_end) values
  ('9fc00000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000ed1', 'plus-shine', 'wayl', 'active', now(), now() + interval '20 days'),
  ('9fc00000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000ed2', 'plus-glow', 'company', 'active', now(), now() + interval '20 days');
insert into public.bulb_entries (user_id, amount, kind, reason) values
  ('00000000-0000-0000-0000-000000000ed1', 20000, 'bonus', 'test');
delete from public.survey_credits where user_id in (
  '00000000-0000-0000-0000-000000000ed1', '00000000-0000-0000-0000-000000000ed2', '00000000-0000-0000-0000-000000000ed3'
);

-- ── Bulbs on the next renewal ──────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000ed3');
select throws_ok(
  $$ select public.set_renewal_bulbs(1000) $$,
  '23514', 'Bulbs pay for your own Plus', 'only for your own Plus'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ed2');
select throws_ok(
  $$ select public.set_renewal_bulbs(1000) $$,
  '23514', 'Bulbs pay for your own Plus', 'not when a company pays for it'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ed1');
select throws_ok(
  $$ select public.set_renewal_bulbs(300) $$,
  '23514', 'Bulbs go in steps of 250', 'in steps of 250'
);
select throws_ok(
  $$ select public.set_renewal_bulbs(11500) $$,
  '23514', 'Bulbs pay up to half of a month', 'up to half of a month'
);
select is(
  (public.set_renewal_bulbs(11250)).renewal_bulbs, 11250, 'the member chooses Bulbs for the next renewal'
);
select throws_ok(
  $$ select public.plus_renewal_bulbs('9fc00000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'only the renewal job prices a renewal'
);

select pg_temp.reset_role();
select is(
  public.plus_renewal_bulbs('9fc00000-0000-0000-0000-0000000000a1'), 11250,
  'the renewal takes them'
);
insert into public.bulb_entries (user_id, amount, kind, reason) values
  ('00000000-0000-0000-0000-000000000ed1', -15100, 'redemption', 'test');
select is(
  public.plus_renewal_bulbs('9fc00000-0000-0000-0000-0000000000a1'), 4750,
  'no more than the member has, in steps of 250'
);
select is(
  public.spend_renewal_bulbs('9fc00000-0000-0000-0000-0000000000a1', 4750), 4750,
  'once paid, the Bulbs are spent'
);
select results_eq(
  $$ select s.renewal_bulbs, (select b.available from private.bulb_balance(s.user_id) b)
     from public.subscriptions s where s.id = '9fc00000-0000-0000-0000-0000000000a1' $$,
  $$ values (0, 150::bigint) $$,
  'and the choice resets'
);

-- ── Monthly survey credits ─────────────────────────────────────────────────

select public.grant_plus_survey_credits();
select results_eq(
  $$ select user_id, amount from public.survey_credits where reason = 'plus_monthly'
     and user_id in ('00000000-0000-0000-0000-000000000ed1', '00000000-0000-0000-0000-000000000ed2')
     order by user_id $$,
  $$ values ('00000000-0000-0000-0000-000000000ed1'::uuid, 25), ('00000000-0000-0000-0000-000000000ed2'::uuid, 10) $$,
  'each Plus member gets their tier''s credits'
);
select public.grant_plus_survey_credits();
select is(
  (select count(*)::integer from public.survey_credits where reason = 'plus_monthly'
     and user_id = '00000000-0000-0000-0000-000000000ed1'),
  1, 'once a month'
);

-- Last month's: M used 5 of 25; 20 expire and this month's 25 arrive.
update public.survey_credits
set period = (period - interval '1 month')::date, created_at = created_at - interval '1 month'
where reason = 'plus_monthly' and user_id = '00000000-0000-0000-0000-000000000ed1';
insert into public.survey_credits (user_id, amount, reason, created_at) values
  ('00000000-0000-0000-0000-000000000ed1', -5, 'response', now() - interval '20 days');
select public.grant_plus_survey_credits();
select results_eq(
  $$ select (select amount from public.survey_credits where reason = 'plus_expired'
       and user_id = '00000000-0000-0000-0000-000000000ed1'),
     private.survey_credit_balance('00000000-0000-0000-0000-000000000ed1') $$,
  $$ values (-20, 25) $$,
  'what''s left of last month expires before the new credits'
);

select * from finish();
rollback;
