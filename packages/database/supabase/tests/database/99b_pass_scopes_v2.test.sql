-- Sign-in scopes v2: address from the address book, and organizations.
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

select plan(8);

-- M works at Curator (admin) and at Books (member); Curator owns the app.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000009b1', 'm9b@example.iq', now());
update public.profiles set full_name = 'Mina' where id = '00000000-0000-0000-0000-0000000009b1';
insert into public.organizations (id, name, slug) values
  ('9b000000-0000-0000-0000-0000000000c1', 'The Iraqi Curator', 'curator-9b'),
  ('9b000000-0000-0000-0000-0000000000c2', 'Books', 'books-9b');
insert into public.memberships (organization_id, user_id, role) values
  ('9b000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000009b1', 'admin'),
  ('9b000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000009b1', 'member');
insert into public.pass_partners (client_id, name, website, redirect_uris, answers, secret_hash, organization_id)
values ('pass_0000000000000000curator9', 'Curator', 'https://curator.iq', '{https://curator.iq/cb}',
  '{profile,address,organizations}', repeat('c', 64), '9b000000-0000-0000-0000-0000000000c1');
insert into public.pass_connections (user_id, client_id, scopes)
values ('00000000-0000-0000-0000-0000000009b1', 'pass_0000000000000000curator9', '{openid,address,organizations}');

select throws_ok(
  $$ update public.pass_partners set answers = '{organizations,orders}' where client_id = 'pass_0000000000000000curator9' $$,
  '23514', null, 'Unknown scopes are still refused'
);
select ok('organizations' = any (private.pass_sensitive_answers()), 'organizations is reviewed before a live app asks');

-- ── Organizations ──
select is(
  public.pass_claims('00000000-0000-0000-0000-0000000009b1', 'pass_0000000000000000curator9', '{openid,organizations}') -> 'organizations',
  '[{"id":"9b000000-0000-0000-0000-0000000000c1","name":"The Iraqi Curator","role":"admin","app_owner":true},
    {"id":"9b000000-0000-0000-0000-0000000000c2","name":"Books","role":"member","app_owner":false}]'::jsonb,
  'Each organization with the role, and which one owns the app'
);
select ok(
  not (public.pass_claims('00000000-0000-0000-0000-0000000009b1', 'pass_0000000000000000curator9', '{openid,address}') ? 'organizations'),
  'Nothing about organizations without the scope'
);
delete from public.memberships where user_id = '00000000-0000-0000-0000-0000000009b1';
select is(
  public.pass_claims('00000000-0000-0000-0000-0000000009b1', 'pass_0000000000000000curator9', '{openid,organizations}') -> 'organizations',
  '[]'::jsonb, 'No organizations: an empty list'
);

-- ── Address ──
insert into public.orders (user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
values ('00000000-0000-0000-0000-0000000009b1', 'pending', 1000, 0, 1000, 0,
  '{"full_name":"Mina","phone":"+9647700000001","address":"Old street 1","city":"Mansour","governorate":"baghdad","notes":""}',
  'delivery', 'cash_on_delivery');
select is(
  public.pass_claims('00000000-0000-0000-0000-0000000009b1', 'pass_0000000000000000curator9', '{openid,address}') -> 'address' ->> 'street_address',
  'Old street 1', 'Without saved addresses, the latest delivery'
);
insert into public.user_addresses (user_id, label, full_name, phone, governorate, area, street, is_default) values
  ('00000000-0000-0000-0000-0000000009b1', 'Work', 'Mina', '+9647700000001', 'baghdad', 'Mansour', 'Office 4', false),
  ('00000000-0000-0000-0000-0000000009b1', 'Home', 'Mina', '+9647700000001', 'basra', 'Ashar', 'Street 9', true);
select is(
  public.pass_claims('00000000-0000-0000-0000-0000000009b1', 'pass_0000000000000000curator9', '{openid,address}') -> 'address',
  '{"formatted":"Street 9, Ashar, basra, Iraq","street_address":"Street 9","locality":"Ashar","region":"basra","country":"IQ"}'::jsonb,
  'The default saved address comes first'
);
select ok(
  not (public.pass_claims('00000000-0000-0000-0000-0000000009b1', 'pass_0000000000000000curator9', '{openid,profile}') ? 'address'),
  'Nothing about the address without the scope'
);

select * from finish();
rollback;
