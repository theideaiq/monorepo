-- The catalog of programs: unclaimed organizations as hosts, and the filter
-- fields, which organizations set subject to review.
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

select plan(37);

-- E is an editor, X someone else, C claims the organization, O owns Tech Co.
delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a5c1', 'e-catalog@example.iq'),
  ('00000000-0000-0000-0000-00000000a5c2', 'x-catalog@example.iq'),
  ('00000000-0000-0000-0000-00000000a5c3', 'c-catalog@example.iq'),
  ('00000000-0000-0000-0000-00000000a5c4', 'o-catalog@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-00000000a5c1', 'editor');
insert into public.organizations (id, name, slug, created_by, features) values
  ('9a7a0000-0000-0000-0000-0000000000a1', 'Tech Co', 'tech-catalog', '00000000-0000-0000-0000-00000000a5c4', '{opportunities}');
insert into public.organization_members (organization_id, user_id, role) values
  ('9a7a0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000a5c4', 'owner');

-- ── Creating and listing unclaimed organizations ───────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c2');
select throws_ok(
  $$ select public.create_unclaimed_organization('DAAD') $$,
  '42501', null, 'members can''t create an unclaimed organization'
);
select throws_ok(
  $$ select * from public.unclaimed_organizations() $$,
  '42501', null, 'or list them'
);
select throws_ok(
  $$ insert into public.organizations (name, slug) values ('DAAD', 'daad-direct') $$,
  '42501', null, 'and organizations still can''t be inserted directly'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1');
select throws_ok(
  $$ select public.create_unclaimed_organization('DAAD') $$,
  '42501', null, 'editors need their authenticator session'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1', 'aal2');
select throws_ok(
  $$ select public.create_unclaimed_organization(' ') $$,
  '23514', null, 'it needs a name'
);
create temp table catalog_host on commit drop as
  select public.create_unclaimed_organization('DAAD') as id;
grant select on catalog_host to public;
select is(
  public.create_unclaimed_organization('  daad '),
  (select id from catalog_host),
  'the same name gives the unclaimed one that exists'
);
select is(
  public.create_unclaimed_organization('هيئة التبادل'::text) is not null,
  true,
  'a name in Arabic still gets a valid slug'
);
select results_eq(
  $$ select name from public.unclaimed_organizations() where name = 'DAAD' $$,
  $$ values ('DAAD'::text) $$,
  'editors see it among the unclaimed'
);
select is_empty(
  $$ select 1 from public.unclaimed_organizations() where id = '9a7a0000-0000-0000-0000-0000000000a1' $$,
  'and not an organization with members'
);

select pg_temp.reset_role();
select results_eq(
  $$ select g.features, g.created_by from public.organizations g join catalog_host h on h.id = g.id $$,
  $$ values ('{opportunities}'::text[], '00000000-0000-0000-0000-00000000a5c1'::uuid) $$,
  'it has the Opportunities section on and records who made it'
);
select is_empty(
  $$ select 1 from public.organization_members m join catalog_host h on h.id = m.organization_id $$,
  'and no members, the editor included'
);

-- ── Listing under it ───────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1', 'aal2');
insert into public.opportunities (id, organization_id, kind, title_ar, title_en, location, status, host_name,
  levels, min_age, max_age, destination_countries, funding_type, iraqi_eligibility, source_url, last_checked_on)
select '9a7a0000-0000-0000-0000-0000000000b1', h.id, 'scholarship', 'منحة', 'A scholarship', 'Berlin', 'approved', 'Someone else',
  '{masters,phd}', 18, 35, '{DE}', 'fully_funded', 'named_official', 'https://daad.example/iraq', '2026-11-01'
from catalog_host h;
select results_eq(
  $$ select host_name, status from public.opportunities where id = '9a7a0000-0000-0000-0000-0000000000b1' $$,
  $$ values ('DAAD'::text, 'approved'::text) $$,
  'an editor lists it straight away, hosted by the organization whatever was typed'
);

select pg_temp.login_anon();
select results_eq(
  $$ select host_name, levels::text[], min_age::int, max_age::int, destination_countries, funding_type::text,
       iraqi_eligibility::text, source_url, last_checked_on
     from public.opportunities where id = '9a7a0000-0000-0000-0000-0000000000b1' $$,
  $$ values ('DAAD'::text, '{masters,phd}'::text[], 18, 35, '{DE}'::text[], 'fully_funded'::text,
       'named_official'::text, 'https://daad.example/iraq'::text, '2026-11-01'::date) $$,
  'visitors read its host, filter fields, source and last checked date'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c2');
select throws_ok(
  $$ insert into public.opportunities (organization_id, kind, title_ar, title_en, remote)
     select id, 'job', 'وظيفة', 'A job', true from catalog_host $$,
  '42501', null, 'nobody else posts under an unclaimed organization'
);
update public.opportunities set title_en = 'Changed' where id = '9a7a0000-0000-0000-0000-0000000000b1';
select is(
  (select title_en from public.opportunities where id = '9a7a0000-0000-0000-0000-0000000000b1'),
  'A scholarship', 'or changes its listing'
);

-- ── The IDEA's own are as they were ────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1', 'aal2');
insert into public.opportunities (id, kind, title_ar, title_en, location, status)
values ('9a7a0000-0000-0000-0000-0000000000b2', 'program', 'برنامج', 'A program', 'Baghdad', 'approved');
select results_eq(
  $$ select host_name, status, levels::text[], funding_type::text, iraqi_eligibility::text, source_url
     from public.opportunities where id = '9a7a0000-0000-0000-0000-0000000000b2' $$,
  $$ values (null::text, 'approved'::text, '{}'::text[], 'unknown'::text, null::text, null::text) $$,
  'no organization still means The IDEA, with nothing stated or graded'
);

-- ── Claiming ───────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c2');
select throws_ok(
  $$ select public.claim_organization((select id from catalog_host), 'x-catalog@example.iq') $$,
  '42501', null, 'nobody claims an organization for themselves'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1', 'aal2');
select throws_ok(
  $$ select public.claim_organization((select id from catalog_host), 'nobody-catalog@example.iq') $$,
  'P0002', null, 'the email must be a Pass'
);
select throws_ok(
  $$ select public.claim_organization('9a7a0000-0000-0000-0000-0000000000a1', 'c-catalog@example.iq') $$,
  '23505', null, 'an organization with members can''t be handed over'
);
select lives_ok(
  $$ select public.claim_organization((select id from catalog_host), ' C-Catalog@Example.iq ') $$,
  'an editor hands it over by Pass email'
);
select is_empty(
  $$ select 1 from public.unclaimed_organizations() u join catalog_host h on h.id = u.id $$,
  'it is no longer unclaimed'
);
select throws_ok(
  $$ select public.claim_organization((select id from catalog_host), 'x-catalog@example.iq') $$,
  '23505', null, 'and can''t be handed over twice'
);
select pg_temp.reset_role();
select results_eq(
  $$ select user_id, role::text from public.organization_members m join catalog_host h on h.id = m.organization_id $$,
  $$ values ('00000000-0000-0000-0000-00000000a5c3'::uuid, 'owner'::text) $$,
  'the claimant is its owner'
);
select is(
  (select host_name from public.opportunities where id = '9a7a0000-0000-0000-0000-0000000000b1'),
  'DAAD', 'and its listing keeps its host'
);

-- ── Review of the filter fields ────────────────────────────────────────────

-- Applies a change as the claimant to the listing (approved again first)
-- and returns its status after.
create function pg_temp.status_after(change text)
returns text
language plpgsql
as $$
declare
  result text;
begin
  perform pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1', 'aal2');
  update public.opportunities set status = 'approved'
  where id = '9a7a0000-0000-0000-0000-0000000000b1';
  perform pg_temp.login_as('00000000-0000-0000-0000-00000000a5c3');
  execute format(
    'update public.opportunities set %s where id = %L',
    change, '9a7a0000-0000-0000-0000-0000000000b1'
  );
  select status into result from public.opportunities
  where id = '9a7a0000-0000-0000-0000-0000000000b1';
  perform pg_temp.reset_role();
  return result;
end;
$$;

select is(pg_temp.status_after($$levels = '{phd}'$$), 'pending', 'changing the levels sends it back for review');
select is(pg_temp.status_after($$min_age = 20$$), 'pending', 'so does the youngest age');
select is(pg_temp.status_after($$max_age = 40$$), 'pending', 'the oldest age');
select is(pg_temp.status_after($$destination_countries = '{DE,AT}'$$), 'pending', 'the destinations');
select is(pg_temp.status_after($$funding_type = 'partly_funded'$$), 'pending', 'the funding');
select is(pg_temp.status_after($$iraqi_eligibility = 'inferred'$$), 'pending', 'the grade');
select is(pg_temp.status_after($$source_url = 'https://daad.example/other'$$), 'pending', 'the source');
select is(pg_temp.status_after($$last_checked_on = '2026-11-03'$$), 'pending', 'and the last checked date');
select is(pg_temp.status_after($$levels = levels, funding_type = funding_type$$), 'approved', 'saving without a change doesn''t');

-- ── Organizations set them; the database keeps them valid ──────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c4');
insert into public.opportunities (id, organization_id, kind, title_ar, title_en, remote, status,
  levels, destination_countries, funding_type, iraqi_eligibility, source_url, last_checked_on)
values ('9a7a0000-0000-0000-0000-0000000000b3', '9a7a0000-0000-0000-0000-0000000000a1', 'internship', 'تدريب', 'Internship', true, 'approved',
  '{undergraduate}', '{TR}', 'stipend_only', 'named_secondary', 'https://tech.example/about', '2026-11-02');
select results_eq(
  $$ select status, levels::text[], funding_type::text, iraqi_eligibility::text
     from public.opportunities where id = '9a7a0000-0000-0000-0000-0000000000b3' $$,
  $$ values ('draft'::text, '{undergraduate}'::text[], 'stipend_only'::text, 'named_secondary'::text) $$,
  'an organization sets them on a draft, which still goes through review'
);
select throws_ok(
  $$ update public.opportunities set destination_countries = '{Germany}' where id = '9a7a0000-0000-0000-0000-0000000000b3' $$,
  '23514', null, 'destinations are country codes'
);
select throws_ok(
  $$ update public.opportunities set min_age = 30, max_age = 20 where id = '9a7a0000-0000-0000-0000-0000000000b3' $$,
  '23514', null, 'the youngest age is not above the oldest'
);
select throws_ok(
  $$ update public.opportunities set source_url = 'http://tech.example' where id = '9a7a0000-0000-0000-0000-0000000000b3' $$,
  '23514', null, 'the source is https'
);

select * from finish();
rollback;
