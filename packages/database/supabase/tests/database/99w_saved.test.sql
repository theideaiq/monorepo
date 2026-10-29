-- Saved, lists and the Plus queue.
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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000e01', 'm9w@example.iq'),
  ('00000000-0000-0000-0000-000000000e02', 'p9w@example.iq'),
  ('00000000-0000-0000-0000-000000000e03', 'x9w@example.iq');
update public.profiles set full_name = 'Mina Karim' where id = '00000000-0000-0000-0000-000000000e01';
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-000000000e02', 'plus-glow', 'active', 'wayl', now(), now() + interval '30 days');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition) values
  ('9e500000-0000-0000-0000-000000000001', 'album-9w', 'ألبوم', 'Album', 24750, 'active', 'sale', 'new'),
  ('9e500000-0000-0000-0000-000000000002', 'game-9w', 'لعبة', 'Game', 39750, 'active', 'sale', 'new');
-- The game can be rented; the album is out of stock.
insert into public.stock_items (product_id, condition, purpose, price) values
  ('9e500000-0000-0000-0000-000000000002', 'new', 'rental', 39750);

-- ── Lists and saved items ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000e01');
insert into public.saved_lists (id, name) values ('9e500000-0000-0000-0000-0000000000a1', 'Birthday');
insert into public.wishlist_items (product_id) values ('9e500000-0000-0000-0000-000000000001');
select results_eq(
  $$ select notify, saved_price from public.wishlist_items $$,
  $$ values (true, 24750::bigint) $$,
  'a saved item tells by default and remembers its price'
);
select lives_ok(
  $$ update public.wishlist_items set list_id = '9e500000-0000-0000-0000-0000000000a1', price_target = 20000 $$,
  'the member moves it to a list with a price target'
);
select throws_ok(
  $$ update public.wishlist_items set saved_price = 1 $$,
  '42501', null, 'the saved price is not theirs to change'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e03');
select is_empty($$ select 1 from public.saved_lists $$, 'lists are private');
select throws_ok(
  $$ insert into public.wishlist_items (product_id, list_id) values
       ('9e500000-0000-0000-0000-000000000002', '9e500000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'nobody saves into another member''s list'
);

-- Shared by link: the list's name, the owner's first name and products.
select pg_temp.login_anon();
select is_empty(
  $$ select 1 from public.shared_list((select share_token from public.saved_lists limit 1)) $$,
  'a private list is not shared'
);
select pg_temp.reset_role();
update public.saved_lists set shared = true;
create temporary table token as select share_token from public.saved_lists;
grant select on token to anon;
select pg_temp.login_anon();
select results_eq(
  $$ select list_name, owner_name, product_id from public.shared_list((select share_token from token)) $$,
  $$ values ('Birthday', 'Mina', '9e500000-0000-0000-0000-000000000001'::uuid) $$,
  'a shared list shows its name, the owner''s first name and its products'
);

-- ── Telling ──
select pg_temp.reset_role();
-- Down to 22,000: above the target of 20,000, so nothing yet.
insert into public.stock_items (product_id, condition, purpose, price) values
  ('9e500000-0000-0000-0000-000000000001', 'new', 'sale', 22000);
select results_eq(
  $$ select event from public.notifications where user_id = '00000000-0000-0000-0000-000000000e01' order by event $$,
  $$ values ('saved_back_in_stock') $$,
  'the first copy in stock is told; a price above the target is not'
);
insert into public.stock_items (product_id, condition, purpose, price) values
  ('9e500000-0000-0000-0000-000000000001', 'new', 'sale', 22000);
select is(
  (select count(*)::integer from public.notifications where user_id = '00000000-0000-0000-0000-000000000e01'),
  1,
  'a second copy is not news'
);
update public.stock_items set price = 19750 where product_id = '9e500000-0000-0000-0000-000000000001';
select results_eq(
  $$ select (data ->> 'price')::bigint from public.notifications
     where user_id = '00000000-0000-0000-0000-000000000e01' and event = 'saved_price_drop' $$,
  $$ values (19750::bigint) $$,
  'a price under the target is told, once'
);
update public.wishlist_items set notify = false;
update public.stock_items set price = 18750 where product_id = '9e500000-0000-0000-0000-000000000001';
select is(
  (select count(*)::integer from public.notifications where event = 'saved_price_drop'),
  1,
  '"Tell me" off: nothing more'
);

-- ── The queue ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000e01');
select throws_ok(
  $$ select public.queue_add('9e500000-0000-0000-0000-000000000002') $$,
  '42501', null, 'the queue is for Plus members'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e02');
select throws_ok(
  $$ select public.queue_add('9e500000-0000-0000-0000-000000000001') $$,
  '23514', null, 'only rentable products join the queue'
);
select lives_ok(
  $$ select public.queue_add('9e500000-0000-0000-0000-000000000002') $$,
  'a Plus member queues a rentable product'
);
select throws_ok(
  $$ insert into public.rental_queue_items (user_id, product_id, position)
     values ('00000000-0000-0000-0000-000000000e02', '9e500000-0000-0000-0000-000000000001', 9) $$,
  '42501', null, 'the queue is written only by its functions'
);
select results_eq(
  $$ select product_id, position from public.rental_queue_items $$,
  $$ values ('9e500000-0000-0000-0000-000000000002'::uuid, 1) $$,
  'the member sees their queue'
);

select * from finish();
rollback;
