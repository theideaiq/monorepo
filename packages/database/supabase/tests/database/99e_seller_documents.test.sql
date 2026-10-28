-- Staff read a shop's listed documents, and nothing else in its folder.
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

select plan(4);

delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000009e1', 'o9e@example.iq'),
  ('00000000-0000-0000-0000-0000000009e2', 'a9e@example.iq'),
  ('00000000-0000-0000-0000-0000000009e3', 'x9e@example.iq');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000009e2', 'admin');
insert into public.organizations (id, name, slug, created_by) values
  ('9e000000-0000-0000-0000-0000000000c1', 'Shop', 'shop-9e', '00000000-0000-0000-0000-0000000009e1');
insert into public.organization_members (organization_id, user_id, role) values
  ('9e000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000009e1', 'owner');
insert into storage.objects (bucket_id, name) values
  ('org-files', '9e000000-0000-0000-0000-0000000000c1/licence.pdf'),
  ('org-files', '9e000000-0000-0000-0000-0000000000c1/invoice.pdf');

select pg_temp.login_as('00000000-0000-0000-0000-0000000009e1');
select public.apply_to_sell('9e000000-0000-0000-0000-0000000000c1', 'Shop');
update public.seller_details set documents = array['9e000000-0000-0000-0000-0000000000c1/licence.pdf'];
select is(
  (select count(*)::int from storage.objects where bucket_id = 'org-files'), 2,
  'Members read their organization''s files'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000009e2', 'aal2');
select results_eq(
  $$ select name from storage.objects where bucket_id = 'org-files' $$,
  $$ values ('9e000000-0000-0000-0000-0000000000c1/licence.pdf') $$,
  'Staff read the documents a shop listed, nothing else'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000009e2', 'aal1');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'org-files'), 0,
  'not without an authenticator-app session'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000009e3');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'org-files'), 0,
  'Others read nothing'
);

select * from finish();
rollback;
