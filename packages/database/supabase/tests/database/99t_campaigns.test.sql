-- Prices: campaigns.
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
  ('00000000-0000-0000-0000-000000000e11', 'o9t@example.iq'),
  ('00000000-0000-0000-0000-000000000e12', 'x9t@example.iq'),
  ('00000000-0000-0000-0000-000000000e15', 'm9t@example.iq');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000e15', 'marketing');
insert into public.organizations (id, name, slug, created_by) values
  ('9e500000-0000-0000-0000-0000000000c1', 'Book Shop', 'books-9t', '00000000-0000-0000-0000-000000000e11');
insert into public.organization_members (organization_id, user_id, role) values
  ('9e500000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000e11', 'owner');
insert into public.sellers (id, organization_id, name, status) values
  ('9e500000-0000-0000-0000-0000000000d1', '9e500000-0000-0000-0000-0000000000c1', 'Book Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition) values
  ('9e500000-0000-0000-0000-000000000001', 'book-9t', 'كتاب', 'Book', 24750, 'active', 'sale', 'new');
create temporary table ids (name text primary key, id uuid);
grant select on ids to authenticated, anon;
insert into ids select 'v', id from public.product_variants where product_id = '9e500000-0000-0000-0000-000000000001';
insert into public.stock_items (product_id, condition, purpose, price, seller_id) values
  ('9e500000-0000-0000-0000-000000000001', 'new', 'sale', 20000, '9e500000-0000-0000-0000-0000000000d1'),
  ('9e500000-0000-0000-0000-000000000001', 'used', 'sale', 10000, '9e500000-0000-0000-0000-0000000000d1');
insert into public.offer_settings (seller_id, variant_id, condition, accept_offers)
select '9e500000-0000-0000-0000-0000000000d1', id, 'new', true from ids where name = 'v';

-- ── Campaigns ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000e12');
select throws_ok(
  $$ insert into public.campaigns (slug, name_en, name_ar, starts_at, ends_at)
     values ('nope-9t', 'Nope', 'لا', now(), now() + interval '1 day') $$,
  '42501', null, 'only staff create campaigns'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e15', 'aal2');
insert into public.campaigns (id, slug, name_en, name_ar, starts_at, ends_at, published) values
  ('9e500000-0000-0000-0000-0000000000a1', 'back-to-school-9t', 'Back to school', 'العودة إلى المدرسة',
   now() - interval '1 minute', now() + interval '7 days', true),
  ('9e500000-0000-0000-0000-0000000000a2', 'draft-9t', 'Draft', 'مسودة', now(), now() + interval '7 days', false);
select pg_temp.login_anon();
select results_eq(
  $$ select slug from public.campaigns where slug like '%-9t' $$,
  $$ values ('back-to-school-9t') $$,
  'anyone sees published campaigns, not drafts'
);

-- ── Taking part ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000e12');
select throws_ok(
  $$ select public.join_campaign('9e500000-0000-0000-0000-0000000000a1', '9e500000-0000-0000-0000-0000000000d1', 20) $$,
  '42501', null, 'only the shop opts in'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e11');
select throws_ok(
  $$ select public.join_campaign('9e500000-0000-0000-0000-0000000000a2', '9e500000-0000-0000-0000-0000000000d1', 20) $$,
  '23514', null, 'not into a draft'
);
select lives_ok(
  $$ select public.join_campaign('9e500000-0000-0000-0000-0000000000a1', '9e500000-0000-0000-0000-0000000000d1', 20) $$,
  'the shop opts in with 20% off'
);

select pg_temp.login_anon();
select results_eq(
  $$ select condition::text, price, sale_ends_at is not null from public.product_offers('9e500000-0000-0000-0000-000000000001') $$,
  $$ values ('used', 8000::bigint, true), ('new', 16000::bigint, true) $$,
  'every listing of the shop costs 20% less, until the campaign ends'
);
select results_eq(
  $$ select condition::text, regular_price, price from public.campaign_listings('back-to-school-9t') $$,
  $$ values ('used', 10000::bigint, 8000::bigint), ('new', 20000::bigint, 16000::bigint) $$,
  'the campaign page features the shop''s listings'
);
select is_empty(
  $$ select 1 from public.offerable_listings('9e500000-0000-0000-0000-000000000001') $$,
  'a listing in a campaign takes no offers'
);

-- A lower sale of its own wins.
select pg_temp.login_as('00000000-0000-0000-0000-000000000e11');
select public.set_listing_sale('9e500000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new',
  15000, now() - interval '1 minute', now() + interval '3 days');
select pg_temp.reset_role();
select is(
  (select price from public.product_offers('9e500000-0000-0000-0000-000000000001') where condition = 'new'),
  15000::bigint,
  'the lower of the sale and the campaign price applies'
);

-- Leaving gives the prices back.
select pg_temp.login_as('00000000-0000-0000-0000-000000000e11');
select public.leave_campaign('9e500000-0000-0000-0000-0000000000a1', '9e500000-0000-0000-0000-0000000000d1');
select pg_temp.reset_role();
select is(
  (select price from public.product_offers('9e500000-0000-0000-0000-000000000001') where condition = 'used'),
  10000::bigint,
  'leaving a campaign gives the price back'
);
select is(
  (select count(*)::integer from public.price_history h join ids on ids.id = h.variant_id
   where h.condition = 'used'),
  3,
  'price history follows the campaign'
);

-- Ended campaigns are closed.
update public.campaigns set starts_at = now() - interval '10 days', ends_at = now() - interval '1 day'
where id = '9e500000-0000-0000-0000-0000000000a1';
select pg_temp.login_as('00000000-0000-0000-0000-000000000e11');
select throws_ok(
  $$ select public.join_campaign('9e500000-0000-0000-0000-0000000000a1', '9e500000-0000-0000-0000-0000000000d1', 20) $$,
  '23514', null, 'not after it ends'
);

select * from finish();
rollback;
