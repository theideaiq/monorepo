-- Staff insights: searches that found nothing, carts started and the key numbers. Run with `bun run db:test`.
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

select plan(12);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- C is a customer, E an editor, S support.
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'ic@example.iq', '{"full_name":"Insight C"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'ie@example.iq', '{"full_name":"Insight E"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'is@example.iq', '{"full_name":"Insight S"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000c2', 'editor'),
  ('00000000-0000-0000-0000-0000000000c3', 'support');

-- ── Searches that found nothing ────────────────────────────────────────────

select pg_temp.login_anon();
select lives_ok(
  $$ select public.record_search_miss('  Vinyl Records ') $$,
  'visitors record a search that found nothing'
);
select public.record_search_miss('vinyl records');
select public.record_search_miss('x');

select pg_temp.reset_role();
select results_eq(
  $$ select term, searches from public.search_misses where term like 'vinyl%' $$,
  $$ values ('vinyl records'::text, 2) $$,
  'terms are folded and counted'
);
select is(
  (select count(*)::integer from public.search_misses where term = 'x'),
  0, 'a one-letter search is ignored'
);

select pg_temp.login_anon();
select throws_ok(
  $$ select * from public.search_misses $$,
  '42501', null, 'visitors cannot read them'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select is(
  (select count(*)::integer from public.search_misses),
  0, 'customers see none'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c2', 'aal2');
select is(
  (select count(*)::integer from public.search_misses where term = 'vinyl records'),
  1, 'editors see them'
);
delete from public.search_misses where term = 'vinyl records';
select pg_temp.reset_role();
select is(
  (select count(*)::integer from public.search_misses where term = 'vinyl records'),
  0, 'and clear them'
);

-- ── Carts started and the key numbers ──────────────────────────────────────

select pg_temp.reset_role();
insert into public.cart_items (user_id, product_id, quantity)
select '00000000-0000-0000-0000-0000000000c1', p.id, 1
from public.products p
where p.status = 'active' and p.kind = 'sale'
limit 1;
select is(
  (select count(*)::integer from public.cart_starts
   where user_id = '00000000-0000-0000-0000-0000000000c1'
     and week = private.baghdad_week(now())),
  1, 'putting something in the cart counts a cart started this week'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ select * from public.staff_metrics() $$,
  '42501', null, 'customers have no key numbers'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c3', 'aal2');
select is(
  (select count(*)::integer from public.staff_metrics(4)),
  4, 'staff get one row per week asked for'
);
select ok(
  (select new_passes >= 3 and carts >= 1 from public.staff_metrics(1)),
  'this week counts the new Passes and the cart started'
);
select is(
  (select week from public.staff_metrics(1)),
  private.baghdad_week(now()),
  'weeks start on Monday, Baghdad time'
);

select * from finish();
rollback;
