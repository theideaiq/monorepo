-- RPC wrappers (migration 20261110000000): the public names are SECURITY
-- INVOKER wrappers around SECURITY DEFINER bodies in private, and the
-- grants still decide who may call them.
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

select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_proc b on b.proname = p.proname
      and b.pronamespace = 'private'::regnamespace
      and b.proargtypes = p.proargtypes
    where n.nspname = 'public'
      and (p.prosecdef or not b.prosecdef)
  $$,
  'Each wrapper runs as the caller and its private body as the owner'
);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'w@example.iq', '{"full_name":"Customer W"}');

select pg_temp.login_anon();
select lives_ok(
  $$ select * from public.product_review_list('00000000-0000-0000-0000-000000000000') $$,
  'Visitors read product reviews through the wrapper'
);
select throws_ok(
  $$ select public.create_order('{}'::jsonb) $$,
  '42501',
  null,
  'Visitors may not call a customer RPC'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select lives_ok(
  $$ select * from public.my_rental_allowance() $$,
  'Customers call their RPCs through the wrapper'
);
select throws_ok(
  $$ select public.set_staff_role('00000000-0000-0000-0000-0000000000c1', 'superadmin') $$,
  null,
  'The private body still checks permissions'
);

select * from finish();
rollback;
