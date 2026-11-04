-- Plus plans have Arabic names in Arabic letters (no Latin falls through on
-- Arabic pages).
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
select plan(3);

select is(
  (select count(*)::integer from public.plans
   where id ~ '^plus-(glow|shine|blaze)(-duo)?(-year|-student)?$' and name_ar is null),
  0,
  'Every Plus plan has an Arabic name'
);

select is(
  (select count(*)::integer from public.plans
   where id like 'plus-%' and name_ar ~ '[A-Za-z]'),
  0,
  'No Plus plan''s Arabic name has Latin letters'
);

select is(
  (select name_ar from public.plans where id = 'plus-glow-duo-student'),
  'ايديا پلص گلو ديو (للطلاب)',
  'Glow Duo for students reads in Arabic letters'
);

select * from finish();
rollback;
