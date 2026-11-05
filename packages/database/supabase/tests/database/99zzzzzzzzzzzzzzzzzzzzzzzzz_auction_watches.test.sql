-- PR 7, C9: watching an auction and the reminder in its last day.
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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f8001', 'watcher-c9@example.iq'),
  ('00000000-0000-0000-0000-0000000f8002', 'leader-c9@example.iq'),
  ('00000000-0000-0000-0000-0000000f8003', 'owner-c9@example.iq');
insert into public.organizations (id, name, slug, created_by) values
  ('9f800000-0000-0000-0000-0000000000c1', 'Watch Shop', 'watch-c9', '00000000-0000-0000-0000-0000000f8003');
insert into public.sellers (id, organization_id, name, status) values
  ('9f800000-0000-0000-0000-0000000000d1', '9f800000-0000-0000-0000-0000000000c1', 'Watch Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id, collectible, images) values
  ('9f800000-0000-0000-0000-000000000001', 'card-c9', 'بطاقة', 'Card', 30000, 'active', 'sale', 'used',
   (select id from public.product_categories where slug = 'music'), true, '{https://example.iq/a.jpg}');
insert into public.stock_items (id, product_id, condition, purpose, price, seller_id) values
  ('9f800000-0000-0000-0000-0000000000a1', '9f800000-0000-0000-0000-000000000001', 'used', 'sale', 30000, '9f800000-0000-0000-0000-0000000000d1'),
  ('9f800000-0000-0000-0000-0000000000a2', '9f800000-0000-0000-0000-000000000001', 'used', 'sale', 30000, '9f800000-0000-0000-0000-0000000000d1');
-- One auction ends in 6 hours, the other in 3 days.
insert into public.auctions (id, seller_id, product_id, variant_id, condition, stock_item_id, photos,
  condition_note, start_price, current_price, days, starts_at, ends_at, status)
select x.id, '9f800000-0000-0000-0000-0000000000d1', v.product_id, v.id, 'used', x.stock,
  '{a.jpg,b.jpg,c.jpg}', 'Light wear on the corners', 30000, 30000, 7, now() - interval '7 days' + x.remaining, now() + x.remaining, 'live'
from public.product_variants v,
  (values
    ('9f800000-0000-0000-0000-0000000000e1'::uuid, '9f800000-0000-0000-0000-0000000000a1'::uuid, interval '6 hours'),
    ('9f800000-0000-0000-0000-0000000000e2'::uuid, '9f800000-0000-0000-0000-0000000000a2'::uuid, interval '3 days')
  ) as x (id, stock, remaining)
where v.product_id = '9f800000-0000-0000-0000-000000000001';
-- The leader of the first is already winning it.
insert into public.bids (auction_id, bidder_id, alias, amount, max_amount, winning) values
  ('9f800000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000f8002', 1, 30000, 40000, true);

select pg_temp.login_as('00000000-0000-0000-0000-0000000f8001');
select lives_ok(
  $$ insert into public.auction_watches (auction_id) values
       ('9f800000-0000-0000-0000-0000000000e1'), ('9f800000-0000-0000-0000-0000000000e2') $$,
  'a member watches live auctions'
);
select is(
  (select count(*)::integer from public.auction_watches),
  2, 'and sees their watches'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000f8002');
select lives_ok(
  $$ insert into public.auction_watches (auction_id) values ('9f800000-0000-0000-0000-0000000000e1') $$,
  'the leader watches too'
);
select is(
  (select count(*)::integer from public.auction_watches),
  1, 'nobody sees anyone else''s'
);
select throws_ok(
  $$ insert into public.auction_watches (user_id, auction_id)
     values ('00000000-0000-0000-0000-0000000f8001', '9f800000-0000-0000-0000-0000000000e2') $$,
  '42501', null, 'nobody watches for someone else'
);
select throws_ok(
  $$ select public.remind_auction_watchers() $$,
  '42501', null, 'members cannot send the reminders'
);

select pg_temp.reset_role();
select is(public.remind_auction_watchers(), 1, 'one reminder is due');
select results_eq(
  $$ select user_id, event, link from public.notifications where event = 'auction_ending' $$,
  $$ select '00000000-0000-0000-0000-0000000f8001'::uuid, 'auction_ending'::text, '/store/auctions/' || number
     from public.auctions where id = '9f800000-0000-0000-0000-0000000000e1' $$,
  'the watcher of the auction in its last day hears, not its leader, and not about the other'
);
select is(public.remind_auction_watchers(), 0, 'only once');

select * from finish();
rollback;
