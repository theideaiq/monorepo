-- Prices: price history, lowest in 30 days and honest "was" prices.
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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000c01', 'o9r@example.iq'),
  ('00000000-0000-0000-0000-000000000c05', 'f9r@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-000000000c05', 'editor');
insert into public.organizations (id, name, slug, created_by) values
  ('9c500000-0000-0000-0000-0000000000c1', 'Record Shop', 'records-9r', '00000000-0000-0000-0000-000000000c01');
insert into public.sellers (id, organization_id, name, status) values
  ('9c500000-0000-0000-0000-0000000000d1', '9c500000-0000-0000-0000-0000000000c1', 'Record Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9c500000-0000-0000-0000-000000000001', 'album-9r', 'ألبوم', 'Album', 24750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'music'));

create temporary table listing as
select v.id as variant from public.product_variants v where v.product_id = '9c500000-0000-0000-0000-000000000001';
grant select on listing to anon, authenticated;

-- Two copies from The IDEA at the variant's price, one from the shop.
insert into public.stock_items (product_id, variant_id, seller_id, condition, purpose, status, price)
select '9c500000-0000-0000-0000-000000000001', variant, x.seller, 'new', 'sale', 'available', x.price
from listing,
  (values ('00000000-0000-4000-8000-000000000001'::uuid, null::bigint),
          ('00000000-0000-4000-8000-000000000001'::uuid, null::bigint),
          ('9c500000-0000-0000-0000-0000000000d1'::uuid, 22750::bigint)) x (seller, price);

select results_eq(
  $$ select seller_id, price from public.price_history h join listing l on l.variant = h.variant_id
     where ended_at is null order by price $$,
  $$ values ('9c500000-0000-0000-0000-0000000000d1'::uuid, 22750::bigint),
            ('00000000-0000-4000-8000-000000000001'::uuid, 24750::bigint) $$,
  'each listing opens at its cheapest copy'
);

-- The IDEA's price held 20 days, the shop's 10.
update public.price_history h set started_at = now() - case
  when h.seller_id = '9c500000-0000-0000-0000-0000000000d1' then interval '10 days' else interval '20 days' end
from listing l where l.variant = h.variant_id;

update public.product_variants v set price = 19750 from listing l where l.variant = v.id;

select results_eq(
  $$ select price, ended_at is null from public.price_history h join listing l on l.variant = h.variant_id
     where seller_id = '00000000-0000-4000-8000-000000000001' order by started_at $$,
  $$ values (24750::bigint, false), (19750::bigint, true) $$,
  'a new price closes the old row and opens one'
);
select is(
  (select compare_at_price from public.product_variants v join listing l on l.variant = v.id),
  24750::bigint,
  'a price held 15 of the last 30 days may be the "was" price'
);

update public.stock_items s set price = 20750
from listing l where l.variant = s.variant_id and s.seller_id = '9c500000-0000-0000-0000-0000000000d1';

select pg_temp.login_anon();
select results_eq(
  $$ select seller_id, price, lowest_30d, was_price from public.product_offers('9c500000-0000-0000-0000-000000000001') $$,
  $$ values ('00000000-0000-4000-8000-000000000001'::uuid, 19750::bigint, 19750::bigint, 24750::bigint),
            ('9c500000-0000-0000-0000-0000000000d1'::uuid, 20750::bigint, 20750::bigint, null::bigint) $$,
  'offers come cheapest first with the lowest in 30 days, and a "was" price only after 15 days'
);
select is(
  (select count(*)::integer from public.price_history h join listing l on l.variant = h.variant_id),
  4,
  'anyone can read price history'
);
select throws_ok($$ select public.refresh_was_prices() $$, '42501', null, 'only the cron refreshes "was" prices');
select pg_temp.reset_role();

-- Staff can't type a "was" price.
select pg_temp.login_as('00000000-0000-0000-0000-000000000c05', 'aal2');
update public.product_variants v set compare_at_price = 99750 from listing l where l.variant = v.id;
select pg_temp.reset_role();
select is(
  (select compare_at_price from public.product_variants v join listing l on l.variant = v.id),
  24750::bigint,
  'a typed "was" price is replaced by the honest one'
);

-- Back up to the old price: no "was" price, as it isn't above today's.
update public.product_variants v set price = 24750 from listing l where l.variant = v.id;
select is(
  (select compare_at_price from public.product_variants v join listing l on l.variant = v.id),
  null::bigint,
  'no "was" price at or below today''s'
);

-- The shop's copy sells: its listing closes.
update public.stock_items s set status = 'sold'
from listing l where l.variant = s.variant_id and s.seller_id = '9c500000-0000-0000-0000-0000000000d1';
select is(
  (select count(*)::integer from public.price_history h join listing l on l.variant = h.variant_id
   where seller_id = '9c500000-0000-0000-0000-0000000000d1' and ended_at is null),
  0,
  'a listing with nothing for sale has no open price'
);
select is(
  private.lowest_price_30d((select variant from listing), '9c500000-0000-0000-0000-0000000000d1', 'new'),
  20750::bigint,
  'the lowest in 30 days remembers closed prices'
);

-- Prices age out: back at 19,750 (so 24,750 is the "was" price), then
-- 24,750 is moved to end 20 days ago, leaving only 10 of the last 30.
update public.product_variants v set price = 19750 from listing l where l.variant = v.id;
delete from public.price_history h using listing l
where l.variant = h.variant_id and h.seller_id = '00000000-0000-4000-8000-000000000001';
insert into public.price_history (variant_id, seller_id, condition, price, started_at, ended_at)
select variant, '00000000-0000-4000-8000-000000000001', 'new', x.price, now() - x.since, now() - x.until
from listing,
  (values (24750::bigint, interval '60 days', interval '20 days'),
          (19750::bigint, interval '20 days', null::interval)) x (price, since, until);
select is(public.refresh_was_prices(), 1, 'the cron refreshes "was" prices');
select is(
  (select compare_at_price from public.product_variants v join listing l on l.variant = v.id),
  null::bigint,
  'a price older than 30 days is no "was" price'
);

select * from finish();
rollback;
