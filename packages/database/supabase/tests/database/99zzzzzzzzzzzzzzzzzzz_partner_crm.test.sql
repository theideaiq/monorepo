-- Programs, part 4: the partner CRM (Staff only).
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
  ('00000000-0000-0000-0000-0000000f4001', 'editor-crm@example.iq'),
  ('00000000-0000-0000-0000-0000000f4002', 'marketing-crm@example.iq'),
  ('00000000-0000-0000-0000-0000000f4003', 'support-crm@example.iq'),
  ('00000000-0000-0000-0000-0000000f4004', 'member-crm@example.iq'),
  ('00000000-0000-0000-0000-0000000f4005', 'admin-crm@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000f4001', 'editor'),
  ('00000000-0000-0000-0000-0000000f4002', 'marketing'),
  ('00000000-0000-0000-0000-0000000f4003', 'support'),
  ('00000000-0000-0000-0000-0000000f4005', 'admin');

-- Editors add and work an organization.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f4001', 'aal2');
select lives_ok(
  $$ insert into public.partner_orgs (id, name, kind, country, website, owner_id, next_action, next_action_on)
     values ('9f600000-0000-0000-0000-0000000000a1', 'Test University', 'university', 'CZ',
       'https://uni.example.cz', '00000000-0000-0000-0000-0000000f4001', 'Email the international office', current_date) $$,
  'editors add organizations with an owner and a next action'
);
select throws_ok(
  $$ insert into public.partner_orgs (name, website) values ('Copy', 'https://UNI.Example.cz') $$,
  '23505', null, 'one organization per website'
);
select throws_ok(
  $$ insert into public.partner_orgs (name, owner_id) values ('Owned', '00000000-0000-0000-0000-0000000f4004') $$,
  '23514', null, 'the owner must be on the staff'
);
select throws_ok(
  $$ insert into public.partner_orgs (name, next_action) values ('Half', 'Call') $$,
  '23514', null, 'a next action needs its date'
);
select lives_ok(
  $$ insert into public.partner_people (id, org_id, name, role, email, source)
     values ('9f600000-0000-0000-0000-0000000000b1', '9f600000-0000-0000-0000-0000000000a1',
       'Jana Test', 'International office', 'office@uni.example.cz', 'University website') $$,
  'editors add a work contact with its source'
);
select lives_ok(
  $$ insert into public.partner_touches (org_id, person_id, channel, summary)
     values ('9f600000-0000-0000-0000-0000000000a1', '9f600000-0000-0000-0000-0000000000b1', 'email', 'Asked about 2027 exchange places') $$,
  'editors log a touch as themselves'
);
select throws_ok(
  $$ insert into public.partner_touches (org_id, channel, summary, staff_id)
     values ('9f600000-0000-0000-0000-0000000000a1', 'call', 'Pretend', '00000000-0000-0000-0000-0000000f4002') $$,
  '42501', null, 'a touch cannot be logged as someone else'
);
select throws_ok(
  $$ insert into public.partner_deals (org_id, title, kind, value_iqd)
     values ('9f600000-0000-0000-0000-0000000000a1', 'Odd', 'delegation', 1000100) $$,
  '23514', null, 'deal values are multiples of 250'
);
select lives_ok(
  $$ insert into public.partner_deals (org_id, title, kind, stage, value_iqd)
     values ('9f600000-0000-0000-0000-0000000000a1', 'Summer delegation', 'delegation', 'proposed', 1000250) $$,
  'editors add deals'
);
delete from public.partner_orgs where id = '9f600000-0000-0000-0000-0000000000a1';
select is(
  (select count(*)::integer from public.partner_orgs where id = '9f600000-0000-0000-0000-0000000000a1'),
  1, 'only admins delete organizations'
);
select pg_temp.reset_role();
select ok(
  exists (select 1 from public.audit_logs where entity_type = 'partner_orgs' and entity_id = '9f600000-0000-0000-0000-0000000000a1'),
  'changes are in the audit log'
);

-- Marketing reads; support, members and aal1 sessions see nothing.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f4002', 'aal2');
select is((select count(*)::integer from public.partner_people), 1, 'marketing sees the people');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f4003', 'aal2');
select is((select count(*)::integer from public.partner_orgs), 0, 'support does not see the CRM');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f4001', 'aal1');
select is((select count(*)::integer from public.partner_people), 0, 'not without an authenticator-app session');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f4004');
select is((select count(*)::integer from public.partner_touches), 0, 'members see nothing');

-- Admins delete; people, touches and deals go with it.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f4005', 'aal2');
delete from public.partner_orgs where id = '9f600000-0000-0000-0000-0000000000a1';
select pg_temp.reset_role();
select is(
  (select count(*)::integer from public.partner_people) + (select count(*)::integer from public.partner_touches)
    + (select count(*)::integer from public.partner_deals),
  0, 'deleting an organization deletes its people, touches and deals'
);

select * from finish();
rollback;
