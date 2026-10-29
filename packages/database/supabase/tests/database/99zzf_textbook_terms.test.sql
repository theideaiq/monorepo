-- Textbook terms: the term a rental runs to, per-term rates priced to its
-- end, a textbook rental due at the term's end, nothing to rent between
-- terms, and Finance managing the terms.
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

select plan(9);

-- ── Fixtures ────────────────────────────────────────────────────────────────
truncate public.products, public.orders, public.rentals cascade;
delete from public.academic_terms;
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000f01', 'student@example.iq', '{"full_name":"Student S"}'),
  ('00000000-0000-0000-0000-000000000f02', 'finance-t@example.iq', '{"full_name":"Finance F"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000f02', 'finance');

update public.store_settings set cash_on_delivery_enabled = true, rental_deposit_rate = 50;
update public.delivery_zones set active = true, fee = 5000, free_from = null where governorate = 'baghdad';

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id) values
  ('9ff00000-0000-0000-0000-000000000001', 'calculus-9zzf', 'التفاضل', 'Calculus', 39750, 2, 'active', 'rental',
   '50000000-0000-0000-0000-000000000008');

create temporary table today as select (now() at time zone 'Asia/Baghdad')::date as d;
grant select on today to anon, authenticated;

-- ── Between terms ───────────────────────────────────────────────────────────

select pg_temp.login_anon();
select is_empty(
  $$ select * from public.rental_quote('9ff00000-0000-0000-0000-000000000001') $$,
  'with no term set, textbooks can''t be rented'
);

-- ── Finance sets the terms ──────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
select throws_ok(
  $$ insert into public.academic_terms (name_ar, name_en, starts_on, ends_on) values ('x', 'x', current_date, current_date + 1) $$,
  '42501', null,
  'customers can''t add terms'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000f02', 'aal2');
select lives_ok(
  $$ insert into public.academic_terms (name_ar, name_en, starts_on, ends_on)
     select 'الفصل الثاني', 'Second term', d + 20, d + 140 from today $$,
  'Finance adds a term'
);
select throws_ok(
  $$ insert into public.academic_terms (name_ar, name_en, starts_on, ends_on) select 'x', 'x', d, d from today $$,
  '23514', null,
  'a term ends after it starts'
);

-- ── Priced to the end of the term ───────────────────────────────────────────

select pg_temp.login_anon();
select is(
  (select name_en from public.rental_term()),
  'Second term',
  'a term starting within 30 days is the one a rental runs to'
);
select results_eq(
  $$ select price, days from public.rental_quote('9ff00000-0000-0000-0000-000000000001') $$,
  $$ select 3750::bigint, 140 from today $$,
  'a textbook rents at the term price until the term ends'
);

select is(
  (public.rentals_quote('[{"product":"9ff00000-0000-0000-0000-000000000001"}]') -> 'items' -> 0 ->> 'until')::date,
  (select d + 140 from today),
  'the rental quote says when a textbook is due'
);

-- ── Due at the end of the term ──────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
create temporary table made (id uuid);
grant all on made to authenticated;
insert into made select (public.create_rental_order(
  '9ff00000-0000-0000-0000-000000000001',
  '{"full_name":"S","phone":"+9647700000951","governorate":"baghdad","address":"Jadriya"}', 'delivery', 'cash_on_delivery'
)).id;

select pg_temp.reset_role();
select is(
  (select (due_at at time zone 'Asia/Baghdad')::date from public.rentals where order_id = (select id from made)),
  (select d + 141 from today),
  'the rental is due at the end of the term''s last day'
);
update public.orders set status = 'delivered' where id = (select id from made);
select is(
  (select (due_at at time zone 'Asia/Baghdad')::date from public.rentals where order_id = (select id from made)),
  (select d + 141 from today),
  'and stays due then once delivered'
);

select * from finish();
rollback;
