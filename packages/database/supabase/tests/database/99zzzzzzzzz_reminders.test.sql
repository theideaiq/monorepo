-- Review requests and cart reminders. Run with `bun run db:test`.
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

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- R bought two records; O's order is old; G's is a gift; Q opted in to
-- marketing, N didn't.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'rr@example.iq', '{"full_name":"Review R"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'ro@example.iq', '{"full_name":"Review O"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'rg@example.iq', '{"full_name":"Review G"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'rq@example.iq', '{"full_name":"Cart Q"}'),
  ('00000000-0000-0000-0000-0000000000d5', 'rn@example.iq', '{"full_name":"Cart N"}');

create temporary table picked as
select p.id, p.slug, row_number() over (order by p.name_en) as n
from public.products p
where p.status = 'active' and p.kind = 'sale'
order by p.name_en
limit 2;
grant select on picked to public;

insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address, is_gift, updated_at) values
  ('99000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 'delivered', 2000, 0, 2000, '{}', false, now() - interval '4 days'),
  ('99000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000d2', 'delivered', 1000, 0, 1000, '{}', false, now() - interval '20 days'),
  ('99000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000d3', 'delivered', 1000, 0, 1000, '{}', true, now() - interval '4 days'),
  ('99000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000d1', 'delivered', 1000, 0, 1000, '{}', false, now() - interval '1 day');
insert into public.order_items (order_id, product_id, name_ar, name_en, unit_price, quantity)
select o.id, picked.id, 'تسجيل', 'Record', 1000, 1
from (values
  ('99000000-0000-0000-0000-0000000000a1'::uuid, 1), ('99000000-0000-0000-0000-0000000000a1'::uuid, 2),
  ('99000000-0000-0000-0000-0000000000a2'::uuid, 1), ('99000000-0000-0000-0000-0000000000a3'::uuid, 1),
  ('99000000-0000-0000-0000-0000000000a4'::uuid, 1)
) as o (id, n)
join picked on picked.n = o.n;
-- R already reviewed the second record.
insert into public.product_reviews (user_id, product_id, rating, status)
select '00000000-0000-0000-0000-0000000000d1', id, 5, 'published' from picked where n = 2;

-- ── Review requests ────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select throws_ok(
  $$ select * from public.take_review_requests() $$,
  '42501', null, 'members cannot take review requests'
);

select pg_temp.reset_role();
create temporary table asked as select * from public.take_review_requests(50)
  where order_id::text like '99000000%';
select is(
  (select array_agg(order_id order by order_id) from asked),
  array['99000000-0000-0000-0000-0000000000a1'::uuid],
  'only the order delivered 3 days ago is asked: not the old one, the gift or yesterday''s'
);
select is(
  (select jsonb_array_length(items) from asked),
  1, 'with the items not reviewed yet'
);
select is(
  (select email from asked), 'rr@example.iq', 'and where to email'
);
select is(
  (select link from public.notifications
   where user_id = '00000000-0000-0000-0000-0000000000d1' and event = 'review_request'),
  '/store/' || (select slug from picked where n = 1) || '#reviews',
  'the notification opens the product''s review form'
);
select is(
  (select count(*)::integer from public.take_review_requests(50) where order_id::text like '99000000%'),
  0, 'an order is asked once'
);

-- ── Cart reminders ─────────────────────────────────────────────────────────

update public.profiles set marketing_opt_in = (id = '00000000-0000-0000-0000-0000000000d4')
where id in ('00000000-0000-0000-0000-0000000000d4', '00000000-0000-0000-0000-0000000000d5');
insert into public.cart_items (user_id, product_id, quantity, created_at, updated_at)
select u.id, picked.id, 1, now() - interval '30 hours', now() - interval '30 hours'
from picked, (values ('00000000-0000-0000-0000-0000000000d4'::uuid), ('00000000-0000-0000-0000-0000000000d5'::uuid)) as u (id)
where picked.n = 1;

create temporary table reminded as select * from public.take_cart_reminders(50)
  where user_id::text like '00000000-0000-0000-0000-0000000000d%';
select is(
  (select array_agg(user_id) from reminded),
  array['00000000-0000-0000-0000-0000000000d4'::uuid],
  'a cart left a day reminds only a Pass that allows marketing'
);
select is(
  (select jsonb_array_length(items) from reminded), 1, 'with what is in the cart'
);
select is(
  (select link from public.notifications
   where user_id = '00000000-0000-0000-0000-0000000000d4' and event = 'cart_reminder'),
  '/cart', 'the notification opens the cart'
);
select is(
  (select count(*)::integer from public.take_cart_reminders(50) where user_id = '00000000-0000-0000-0000-0000000000d4'),
  0, 'one reminder per cart'
);

-- Without triggers, which would stamp updated_at with now().
set local session_replication_role = replica;
update public.cart_items set quantity = 2, updated_at = now() - interval '25 hours'
where user_id = '00000000-0000-0000-0000-0000000000d4';
set local session_replication_role = origin;
update public.cart_reminders set sent_at = now() - interval '26 hours'
where user_id = '00000000-0000-0000-0000-0000000000d4';
select is(
  (select count(*)::integer from public.take_cart_reminders(50) where user_id = '00000000-0000-0000-0000-0000000000d4'),
  1, 'a cart changed after the reminder gets one more a day later'
);

set local session_replication_role = replica;
update public.cart_items set updated_at = now() - interval '2 hours'
where user_id = '00000000-0000-0000-0000-0000000000d4';
set local session_replication_role = origin;
update public.cart_reminders set sent_at = now() - interval '26 hours'
where user_id = '00000000-0000-0000-0000-0000000000d4';
select is(
  (select count(*)::integer from public.take_cart_reminders(50) where user_id = '00000000-0000-0000-0000-0000000000d4'),
  0, 'not before the cart has been left 24 hours'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d4');
select throws_ok(
  $$ select * from public.cart_reminders $$,
  '42501', null, 'nobody reads the reminders table'
);

select * from finish();
rollback;
