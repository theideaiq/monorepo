-- More ways to earn Bulbs: birthdays, photo reviews and event check-ins.
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
select plan(19);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- M is a member who bought a book, P a Plus member, S support, E an editor.
delete from public.staff;
truncate public.bulb_entries;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000007e1', 'xm@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-0000000007e2', 'xp@example.iq', '{"full_name":"Plus P"}'),
  ('00000000-0000-0000-0000-0000000007e3', 'xs@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-0000000007e4', 'xe@example.iq', '{"full_name":"Editor E"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000007e3', 'support'),
  ('00000000-0000-0000-0000-0000000007e4', 'editor');

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind) values
  ('74000000-0000-0000-0000-0000000000a1', 'extras-book', 'كتاب', 'Book', 100000, 10, 'active', 'sale');
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address) values
  ('74000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000007e1', 'shipped', 100000, 0, 100000, '{}');
insert into public.order_items (order_id, product_id, name_ar, name_en, unit_price, quantity) values
  ('74000000-0000-0000-0000-0000000000b1', '74000000-0000-0000-0000-0000000000a1', 'كتاب', 'Book', 100000, 1);

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier, bulb_rate)
values ('plus-extras-test', 'Plus Test', 15000, 'month', 'plus', 1, 1, 4);
insert into public.subscriptions (id, user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('74000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000007e2', 'plus-extras-test', 'active', 'wayl', now(), now() + interval '30 days');

-- ── Plus payments ───────────────────────────────────────────────────────────
-- Plus fees earn no Bulbs (P's plan rate is for what P buys and rents).
insert into public.payments (id, user_id, subscription_id, reference_id, provider, amount, status, paid_at)
values ('74000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000007e2',
  '74000000-0000-0000-0000-0000000000c1', 'extras-plus-1', 'wayl', 15000, 'paid', now());
select is((select count(*)::integer from public.bulb_entries where payment_id = '74000000-0000-0000-0000-0000000000d1'), 0, 'a Plus payment earns no Bulbs');
update public.payments set status = 'paid', description = 'again' where id = '74000000-0000-0000-0000-0000000000d1';
select is((select count(*)::integer from public.bulb_entries where payment_id = '74000000-0000-0000-0000-0000000000d1'), 0, 'nor when it is paid again');
update public.payments set status = 'refunded', refunded_amount = 15000 where id = '74000000-0000-0000-0000-0000000000d1';
select is((select count(*)::integer from public.bulb_entries where payment_id = '74000000-0000-0000-0000-0000000000d1'), 0, 'nor when it is refunded');

-- ── Birthdays ───────────────────────────────────────────────────────────────
update public.profiles set birthday = ((now() at time zone 'Asia/Baghdad')::date - interval '30 years')::date
where id = '00000000-0000-0000-0000-0000000007e1';
update public.profiles set birthday = ((now() at time zone 'Asia/Baghdad')::date - interval '30 years' + interval '1 day')::date
where id = '00000000-0000-0000-0000-0000000007e2';
select is(public.run_birthday_bulbs(), 1, 'today''s birthday gets its bonus');
select results_eq(
  $$ select amount from public.bulb_entries where user_id = '00000000-0000-0000-0000-0000000007e1' and reason like 'birthday_%' $$,
  $$ values (2500) $$,
  '2,500 Bulbs'
);
select is(public.run_birthday_bulbs(), 0, 'once a year');
select is(
  (select count(*)::integer from public.notifications where user_id = '00000000-0000-0000-0000-0000000007e1' and event = 'bulbs_birthday'),
  1,
  'with a notification'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000007e1');
select isnt(public.my_birthday(), null, 'members read their own birthday');
select throws_ok(
  $$ select birthday from public.profiles $$,
  '42501', null, 'but not through profiles (co-members can read those rows)'
);
select throws_ok(
  $$ update public.profiles set birthday = date '1990-01-01' where id = '00000000-0000-0000-0000-0000000007e1' $$,
  '42501', null, 'members can''t move their birthday once set'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000007e3', 'aal2');
select lives_ok(
  $$ update public.profiles set birthday = date '1990-01-01' where id = '00000000-0000-0000-0000-0000000007e1' $$,
  'support can correct it'
);
select pg_temp.reset_role();

-- ── Photo reviews ───────────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000007e1');
select throws_ok(
  $$ insert into public.product_reviews (product_id, user_id, rating, photos)
     values ('74000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000007e1', 5,
       array['00000000-0000-0000-0000-0000000007e2/x.webp']) $$,
  '23514', null, 'review photos must be the author''s own'
);
insert into public.product_reviews (product_id, user_id, rating, comment, photos)
values ('74000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000007e1', 5, 'Great', array['00000000-0000-0000-0000-0000000007e1/x.webp']);
select pg_temp.reset_role();
select results_eq(
  $$ select amount from public.bulb_entries e join public.product_reviews r on r.id = e.review_id
     where r.user_id = '00000000-0000-0000-0000-0000000007e1' and e.status <> 'void' $$,
  $$ values (500) $$,
  'a published photo review of a bought product earns 500 Bulbs'
);
update public.product_reviews set status = 'hidden' where user_id = '00000000-0000-0000-0000-0000000007e1';
select is(
  (select e.status::text from public.bulb_entries e join public.product_reviews r on r.id = e.review_id
   where r.user_id = '00000000-0000-0000-0000-0000000007e1'),
  'void',
  'hiding the review voids it'
);
delete from public.product_reviews where user_id = '00000000-0000-0000-0000-0000000007e1';
insert into public.product_reviews (product_id, user_id, rating, comment, photos)
values ('74000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-0000000007e1', 5, 'Again', array['00000000-0000-0000-0000-0000000007e1/y.webp']);
select results_eq(
  $$ select count(*)::integer from public.bulb_entries
     where user_id = '00000000-0000-0000-0000-0000000007e1' and reason = 'photo_review' $$,
  $$ values (1) $$,
  'deleting a photo review and writing it again earns nothing more'
);
update public.bulb_entries set status = 'available'
where user_id = '00000000-0000-0000-0000-0000000007e1' and reason = 'photo_review';
update public.product_reviews set status = 'hidden' where user_id = '00000000-0000-0000-0000-0000000007e1';
select is(
  (select status::text from public.bulb_entries
   where user_id = '00000000-0000-0000-0000-0000000007e1' and reason = 'photo_review'),
  'void',
  'hiding the rewritten review voids the earlier review''s bonus'
);

-- ── Event check-ins ─────────────────────────────────────────────────────────
insert into public.events (id, slug, title_ar, title_en, location, starts_at, published, rsvp_opens_at) values
  ('74000000-0000-0000-0000-0000000000f1', 'extras-night', 'أمسية', 'Night', 'Baghdad', now() + interval '1 day', true, now());
insert into public.event_rsvps (event_id, user_id) values
  ('74000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000007e1');

select pg_temp.login_as('00000000-0000-0000-0000-0000000007e1');
select throws_ok(
  $$ select public.check_in_rsvp('74000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000007e1') $$,
  '42501', null, 'members can''t check themselves in'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000007e4', 'aal2');
select public.check_in_rsvp('74000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000007e1');
select public.check_in_rsvp('74000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000007e1');
select throws_ok(
  $$ select public.check_in_rsvp('74000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000007e2') $$,
  'P0002', null, 'only members who RSVP''d'
);
select pg_temp.reset_role();
select results_eq(
  $$ select amount from public.bulb_entries where event_id = '74000000-0000-0000-0000-0000000000f1' $$,
  $$ values (1000) $$,
  'checking in pays 1,000 Bulbs once'
);

select * from finish();
rollback;
