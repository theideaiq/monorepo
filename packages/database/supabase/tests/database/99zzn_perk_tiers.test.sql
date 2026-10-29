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

select plan(11);

-- G has Plus Glow, B Plus Blaze; X has no Plus. A café offers 10% to
-- everyone, 20% to Plus, and a Blaze-only perk.
truncate public.perks cascade;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000ef1', 'g9zzn@example.iq'),
  ('00000000-0000-0000-0000-000000000ef2', 'b9zzn@example.iq'),
  ('00000000-0000-0000-0000-000000000ef3', 'x9zzn@example.iq'),
  ('00000000-0000-0000-0000-000000000ef4', 'o9zzn@example.iq');
insert into public.subscriptions (user_id, plan_id, provider, status, current_period_start, current_period_end) values
  ('00000000-0000-0000-0000-000000000ef1', 'plus-glow', 'wayl', 'active', now(), now() + interval '20 days'),
  ('00000000-0000-0000-0000-000000000ef2', 'plus-blaze', 'wayl', 'active', now(), now() + interval '20 days');
insert into public.organizations (id, name, slug, created_by) values
  ('9fe00000-0000-0000-0000-0000000000c1', 'Café', 'cafe-9zzn', '00000000-0000-0000-0000-000000000ef4'),
  ('9fe00000-0000-0000-0000-0000000000c2', 'Books', 'books-9zzn', '00000000-0000-0000-0000-000000000ef4');
insert into public.perks (id, organization_id, partner_name, title_ar, title_en, audience, plus_tiers, position) values
  ('9fe00000-0000-0000-0000-000000000001', '9fe00000-0000-0000-0000-0000000000c1', 'Café', 'خصم 10%', '10% off', 'everyone', null, 1),
  ('9fe00000-0000-0000-0000-000000000002', '9fe00000-0000-0000-0000-0000000000c1', 'Café', 'خصم 20%', '20% off', 'plus', null, 2),
  ('9fe00000-0000-0000-0000-000000000003', '9fe00000-0000-0000-0000-0000000000c1', 'Café', 'قهوة مجانية', 'Free coffee', 'plus', '{3}', 3),
  ('9fe00000-0000-0000-0000-000000000004', '9fe00000-0000-0000-0000-0000000000c2', 'Books', 'خصم', 'Books off', 'everyone', null, 4);

-- ── Pairs ───────────────────────────────────────────────────────────────────

update public.perks set paired_with = '9fe00000-0000-0000-0000-000000000002'
where id = '9fe00000-0000-0000-0000-000000000001';
select is(
  (select paired_with from public.perks where id = '9fe00000-0000-0000-0000-000000000002'),
  '9fe00000-0000-0000-0000-000000000001'::uuid,
  'pairing a perk pairs the other back'
);
select throws_ok(
  $$ update public.perks set paired_with = '9fe00000-0000-0000-0000-000000000004'
     where id = '9fe00000-0000-0000-0000-000000000003' $$,
  '23514', 'Pair perks of the same partner', 'pairs are of one partner'
);
select throws_ok(
  $$ update public.perks set plus_tiers = '{2}' where id = '9fe00000-0000-0000-0000-000000000001' $$,
  '23514', null, 'only Plus perks are aimed at tiers'
);

-- ── What each person sees ──────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000ef3');
select results_eq(
  $$ select id, open, upgrade ->> 'title_en' from public.my_perks() where id::text like '9fe%' $$,
  $$ values ('9fe00000-0000-0000-0000-000000000001'::uuid, true, '20% off'),
            ('9fe00000-0000-0000-0000-000000000003'::uuid, false, null),
            ('9fe00000-0000-0000-0000-000000000004'::uuid, true, null) $$,
  'without Plus: the perk for everyone, with Plus''s better one as an upgrade'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ef1');
select results_eq(
  $$ select id, open, upgrade from public.my_perks() where id::text like '9fe%' $$,
  $$ values ('9fe00000-0000-0000-0000-000000000002'::uuid, true, null::jsonb),
            ('9fe00000-0000-0000-0000-000000000003'::uuid, false, null::jsonb),
            ('9fe00000-0000-0000-0000-000000000004'::uuid, true, null::jsonb) $$,
  'with Plus: the better perk of the pair only'
);
select is(
  (select open from public.my_perks() where id = '9fe00000-0000-0000-0000-000000000003'),
  false, 'a perk for Blaze isn''t open to Glow'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ef2');
select is(
  (select open from public.my_perks() where id = '9fe00000-0000-0000-0000-000000000003'),
  true, 'Blaze gets it'
);
select pg_temp.login_anon();
select is(
  (select count(*)::integer from public.my_perks() where id::text like '9fe%'),
  3, 'visitors see the perks on offer, one of each pair'
);

-- ── Partners' check ────────────────────────────────────────────────────────

select pg_temp.reset_role();
select results_eq(
  $$ select private.perk_open('00000000-0000-0000-0000-000000000ef1', k), private.perk_open('00000000-0000-0000-0000-000000000ef2', k)
     from public.perks k where k.id = '9fe00000-0000-0000-0000-000000000003' $$,
  $$ values (false, true) $$,
  'the card check follows the tiers'
);

-- ── Unpairing ───────────────────────────────────────────────────────────────

update public.perks set paired_with = null where id = '9fe00000-0000-0000-0000-000000000002';
select is(
  (select paired_with from public.perks where id = '9fe00000-0000-0000-0000-000000000001'),
  null::uuid, 'unpairing one unpairs both'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ef1');
select is(
  (select count(*)::integer from public.my_perks() where id::text like '9fe%'),
  4, 'and both show again'
);

select * from finish();
rollback;
