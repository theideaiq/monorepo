-- PR 7, C11: what's inside a game night kit.
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

select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f6001', 'support-kits@example.iq'),
  ('00000000-0000-0000-0000-0000000f6002', 'member-kits@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000f6001', 'support');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f6001', 'aal2');
select lives_ok(
  $$ update public.kit_types set
       contents_ar = '{"جهاز پلايستيشن 5","يدتين تحكم"}',
       contents_en = '{"A PlayStation 5","2 controllers"}'
     where id = 'ps5' $$,
  'support lists what is inside a kit'
);
select throws_ok(
  $$ update public.kit_types set contents_ar = '{"يدتين تحكم"}', contents_en = '{"2 controllers","HDMI cable"}'
     where id = 'ps5' $$,
  '23514', null, 'the two languages list the same items'
);
select throws_ok(
  $$ update public.kit_types set contents_ar = '{""}', contents_en = '{""}' where id = 'ps5' $$,
  '23514', null, 'no empty items'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000f6002');
select is(
  (select contents_en from public.kit_types where id = 'ps5'),
  '{"A PlayStation 5","2 controllers"}'::text[],
  'anyone reads what is inside'
);
update public.kit_types set contents_en = '{"Pretend"}', contents_ar = '{"تجربة"}' where id = 'ps5';
select pg_temp.reset_role();
select is(
  (select contents_en from public.kit_types where id = 'ps5'),
  '{"A PlayStation 5","2 controllers"}'::text[],
  'members cannot change it'
);

select * from finish();
rollback;
