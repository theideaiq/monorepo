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

select plan(20);

-- O owns a shop and a company, M is a member there, X is someone else, S is
-- support, A is a staff admin, C buys.
delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a281', 'o9zzp@example.iq'),
  ('00000000-0000-0000-0000-00000000a282', 'm9zzp@example.iq'),
  ('00000000-0000-0000-0000-00000000a283', 'x9zzp@example.iq'),
  ('00000000-0000-0000-0000-00000000a284', 's9zzp@example.iq'),
  ('00000000-0000-0000-0000-00000000a285', 'a9zzp@example.iq'),
  ('00000000-0000-0000-0000-00000000a286', 'c9zzp@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-00000000a284', 'support'),
  ('00000000-0000-0000-0000-00000000a285', 'admin');
insert into public.organizations (id, name, slug, created_by) values
  ('9a2a0000-0000-0000-0000-0000000000a1', 'Corner Shop', 'corner-9zzp', '00000000-0000-0000-0000-00000000a281'),
  ('9a2a0000-0000-0000-0000-0000000000a2', 'Book House', 'books-9zzp', '00000000-0000-0000-0000-00000000a281'),
  ('9a2a0000-0000-0000-0000-0000000000a3', 'Robotics Society', 'robots-9zzp', '00000000-0000-0000-0000-00000000a281');
insert into public.organization_members (organization_id, user_id, role)
select o, '00000000-0000-0000-0000-00000000a281', 'owner'
from unnest(array['9a2a0000-0000-0000-0000-0000000000a1', '9a2a0000-0000-0000-0000-0000000000a2',
                  '9a2a0000-0000-0000-0000-0000000000a3']::uuid[]) o;
insert into public.organization_members (organization_id, user_id, role) values
  ('9a2a0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000a282', 'member');
update public.store_settings set individual_monthly_limit = 100000;
create temporary table ids (name text primary key, id uuid);
grant all on ids to authenticated;

-- ── Shop kinds ─────────────────────────────────────────────────────────────

select is(
  (select kind::text from public.sellers where is_house), null, 'The IDEA has no shop kind'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a281');
insert into ids select 'corner', id from public.apply_to_sell('9a2a0000-0000-0000-0000-0000000000a1', 'Corner Shop');
insert into ids select 'books', id
from public.apply_to_sell('9a2a0000-0000-0000-0000-0000000000a2', 'Book House', 'registered');
select is(
  (select kind::text from public.sellers where id = (select id from ids where name = 'corner')),
  'individual', 'a shop applies as an individual trader unless it says otherwise'
);
select is(
  (select kind::text from public.sellers where id = (select id from ids where name = 'books')),
  'registered', 'a shop can apply as registered'
);
select throws_ok(
  $$ select public.set_shop_kind((select id from ids where name = 'corner'), 'registered') $$,
  '42501', 'Staff only', 'shops can''t change their own kind'
);

select pg_temp.reset_role();
update public.sellers set status = 'approved' where id in (select id from ids);
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
select o, '00000000-0000-0000-0000-00000000a286', s::public.order_status, 0, 0, 0, 0,
  '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9, Street 5","city":"Karrada","governorate":"baghdad"}',
  'delivery', 'cash_on_delivery'
from (values ('9a2a0000-0000-0000-0000-0000000000e1'::uuid, 'confirmed'),
             ('9a2a0000-0000-0000-0000-0000000000e2'::uuid, 'cancelled')) v(o, s);

-- A buyer's checkout writes the lines.
select lives_ok(
  $$ insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, seller_id, seller_name)
     values ('9a2a0000-0000-0000-0000-0000000000e1', 'دفتر', 'Notebook', 30000, 2,
             (select id from ids where name = 'corner'), 'Corner Shop') $$,
  'an individual trader sells within the limit'
);
select lives_ok(
  $$ insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, seller_id, seller_name)
     values ('9a2a0000-0000-0000-0000-0000000000e2', 'دفتر', 'Notebook', 30000, 1,
             (select id from ids where name = 'corner'), 'Corner Shop') $$,
  'a cancelled order''s line is written'
);
select throws_ok(
  $$ insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, seller_id, seller_name)
     values ('9a2a0000-0000-0000-0000-0000000000e1', 'دفتر', 'Notebook', 30000, 2,
             (select id from ids where name = 'corner'), 'Corner Shop') $$,
  '23514', 'Corner Shop has reached its monthly sales limit', 'but not past it (cancelled orders don''t count)'
);
select lives_ok(
  $$ insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, seller_id, seller_name)
     values ('9a2a0000-0000-0000-0000-0000000000e1', 'كتاب', 'Book', 90000, 3,
             (select id from ids where name = 'books'), 'Book House') $$,
  'registered shops have no limit'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a281');
select is(
  public.shop_limit((select id from ids where name = 'corner')),
  '{"kind": "individual", "sold": 60000, "limit": 100000}'::jsonb,
  'the owner sees how much of the month''s limit is used'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a283');
select throws_ok(
  $$ select public.shop_limit((select id from ids where name = 'corner')) $$,
  '42501', 'Not allowed', 'nobody else does'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a285', 'aal2');
select is(
  (public.set_shop_kind((select id from ids where name = 'corner'), 'registered')).kind::text,
  'registered', 'staff change a shop''s kind'
);

-- ── Organizations ──────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a282');
select throws_ok(
  $$ select public.request_organization_check('9a2a0000-0000-0000-0000-0000000000a1', 'letter',
       '9a2a0000-0000-0000-0000-0000000000a1/letter.pdf') $$,
  '42501', 'Only owners and admins can verify the organization', 'members can''t ask'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a281');
select throws_ok(
  $$ select public.request_organization_check('9a2a0000-0000-0000-0000-0000000000a2', 'domain') $$,
  '23514', 'Verify a domain in Developers first', 'a domain must be verified first'
);
select throws_ok(
  $$ select public.request_organization_check('9a2a0000-0000-0000-0000-0000000000a1', 'letter',
       '9a2a0000-0000-0000-0000-0000000000a2/letter.pdf') $$,
  '23514', 'Add the official letter', 'the letter comes from the organization''s own folder'
);

select pg_temp.reset_role();
insert into public.pass_partner_domains (organization_id, domain, verified_at) values
  ('9a2a0000-0000-0000-0000-0000000000a2', 'bookhouse.iq', now()),
  ('9a2a0000-0000-0000-0000-0000000000a3', 'robotics.uot.edu.iq', now());
select pg_temp.login_as('00000000-0000-0000-0000-00000000a281');
select is(
  public.request_organization_check('9a2a0000-0000-0000-0000-0000000000a2', 'domain'),
  'verified', 'a verified domain verifies a company at once'
);
select throws_ok(
  $$ select public.request_organization_check('9a2a0000-0000-0000-0000-0000000000a3', 'domain', null, true) $$,
  '23514', 'Add the university and its approval', 'student societies add their university''s approval'
);
select is(
  public.request_organization_check('9a2a0000-0000-0000-0000-0000000000a3', 'domain', null, true,
    'University of Technology', '9a2a0000-0000-0000-0000-0000000000a3/approval.pdf'),
  'pending', 'and are reviewed'
);
select is(
  public.request_organization_check('9a2a0000-0000-0000-0000-0000000000a1', 'letter',
    '9a2a0000-0000-0000-0000-0000000000a1/letter.pdf'),
  'pending', 'a letter is reviewed'
);
select throws_ok(
  $$ select public.review_organization_check('9a2a0000-0000-0000-0000-0000000000a1', true) $$,
  '42501', 'Not allowed', 'only support reviews'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a284', 'aal2');
select public.review_organization_check('9a2a0000-0000-0000-0000-0000000000a1', true);
select public.review_organization_check('9a2a0000-0000-0000-0000-0000000000a3', false, 'The approval is unsigned');
select pg_temp.reset_role();
select results_eq(
  $$ select o.slug, v.status, v.reject_reason,
       (select count(*)::integer from public.notifications n
        where n.user_id = '00000000-0000-0000-0000-00000000a281'
          and n.event = case when v.status = 'verified' then 'organization_verified' else 'organization_rejected' end)
     from public.organization_verifications v join public.organizations o on o.id = v.organization_id
     where v.reviewed_at is not null order by o.slug $$,
  $$ values ('corner-9zzp', 'verified', null::text, 1), ('robots-9zzp', 'rejected', 'The approval is unsigned', 1) $$,
  'support approves or rejects, and the owner hears'
);

select * from finish();
rollback;
