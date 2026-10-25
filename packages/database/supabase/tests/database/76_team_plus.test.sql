-- The IDEA Plus for a company's team: seats, approval, renewals and leaving.
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
select plan(16);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- O owns the company, M and N are members, X is outside it, F is finance.
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000076a1', 'to@example.iq', '{"full_name":"Owner O"}'),
  ('00000000-0000-0000-0000-0000000076a2', 'tm@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-0000000076a3', 'tx@example.iq', '{"full_name":"Outsider X"}'),
  ('00000000-0000-0000-0000-0000000076a4', 'tn@example.iq', '{"full_name":"Member N"}'),
  ('00000000-0000-0000-0000-0000000076a5', 'tf@example.iq', '{"full_name":"Finance F"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000076a5', 'finance');

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier) values
  ('team-plus', 'Plus', 25000, 'month', 'plus', 1, 1),
  ('team-suite', 'Suite', 90000, 'month', 'business', null, null);

insert into public.organizations (id, name, slug, created_by) values
  ('76000000-0000-0000-0000-0000000000c1', 'Acme', 'acme-team-plus', '00000000-0000-0000-0000-0000000076a1');
insert into public.memberships (organization_id, user_id, role) values
  ('76000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000076a1', 'owner'),
  ('76000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000076a2', 'member'),
  ('76000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000076a4', 'member')
on conflict do nothing;

-- N already has their own Plus.
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-0000000076a4', 'team-plus', 'active', 'wayl', now(), now() + interval '10 days');

-- ── Requests ────────────────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000076a2');
select throws_ok(
  $$ select public.request_plus_seat('76000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000076a2', 'team-plus') $$,
  '42501', null, 'members can''t ask for seats'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000076a1');
select throws_ok(
  $$ select public.request_plus_seat('76000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000076a3', 'team-plus') $$,
  '23514', null, 'seats are for the company''s members'
);
select throws_ok(
  $$ select public.request_plus_seat('76000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000076a2', 'team-suite') $$,
  '23514', null, 'seats are The IDEA Plus plans'
);
select lives_ok(
  $$ select public.request_plus_seat('76000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000076a2', 'team-plus') $$,
  'owners ask for a seat for a member'
);
select throws_ok(
  $$ select public.request_plus_seat('76000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000076a2', 'team-plus') $$,
  '23505', null, 'one open seat per member'
);
select lives_ok(
  $$ select public.request_plus_seat('76000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000076a4', 'team-plus') $$,
  'a seat for N'
);
select throws_ok(
  $$ insert into public.plus_seats (organization_id, user_id, plan_id) values ('76000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000076a1', 'team-plus') $$,
  '42501', null, 'seats only through the requests'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000076a3');
select is_empty($$ select * from public.plus_seats $$, 'outsiders see no seats');
select pg_temp.login_as('00000000-0000-0000-0000-0000000076a2');
select is((select count(*)::integer from public.plus_seats), 1, 'members see their own seat');

-- ── Approval ────────────────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000076a1');
select throws_ok(
  $$ select public.activate_plus_seat((select id from public.plus_seats where user_id = '00000000-0000-0000-0000-0000000076a2')) $$,
  '42501', null, 'only finance approves seats'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000076a5', 'aal2');
select throws_ok(
  $$ select public.activate_plus_seat((select id from public.plus_seats where user_id = '00000000-0000-0000-0000-0000000076a4')) $$,
  '23505', null, 'a member with their own Plus can''t get a seat'
);
select public.activate_plus_seat((select id from public.plus_seats where user_id = '00000000-0000-0000-0000-0000000076a2'));
select pg_temp.reset_role();
select is(
  private.plus_tier('00000000-0000-0000-0000-0000000076a2'), 1,
  'the member has The IDEA Plus'
);
select results_eq(
  $$ select amount, description like 'The IDEA Plus · Plus · %' from public.invoices
     where organization_id = '76000000-0000-0000-0000-0000000000c1' $$,
  $$ values (25000::bigint, true) $$,
  'the company is invoiced for the first month'
);

-- ── Renewals ────────────────────────────────────────────────────────────────
update public.subscriptions set current_period_start = now() - interval '29 days',
  current_period_end = now() + interval '1 day'
where user_id = '00000000-0000-0000-0000-0000000076a2';
select is(public.run_plus_seat_renewals(), 1, 'the renewals extend the seat due soon');
select is(
  (select count(*)::integer from public.invoices where organization_id = '76000000-0000-0000-0000-0000000000c1'),
  2, 'and invoice the company for it'
);

-- ── Leaving ─────────────────────────────────────────────────────────────────
delete from public.memberships
where organization_id = '76000000-0000-0000-0000-0000000000c1'
  and user_id = '00000000-0000-0000-0000-0000000076a2';
select results_eq(
  $$ select p.status::text, s.cancel_at_period_end from public.plus_seats p
     join public.subscriptions s on s.id = p.subscription_id
     where p.user_id = '00000000-0000-0000-0000-0000000076a2' $$,
  $$ values ('ended', true) $$,
  'leaving the company ends the seat at the end of its month'
);

select * from finish();
rollback;
