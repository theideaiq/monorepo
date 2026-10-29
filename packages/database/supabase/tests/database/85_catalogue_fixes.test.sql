-- Program revision v1, step 3: six categories and age ratings.
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

select results_eq(
  $$ select slug from public.product_categories where parent_id is null order by position $$,
  $$ values ('music'), ('games'), ('books'), ('films'), ('gear'), ('board-games'), ('trading-cards') $$,
  'the store has seven top-level categories: Music, Games, Books, Films, Gear, Board games, Trading cards'
);

select is(
  (select age_rating from public.products where slug = 'elden-ring-ps5'),
  16::smallint,
  'games carry a PEGI age rating'
);

select lives_ok(
  $$ update public.products set age_rating = 18 where slug = 'ea-fc-26-ps5' $$,
  'PEGI 18 is a valid age rating'
);

select throws_ok(
  $$ update public.products set age_rating = 15 where slug = 'ea-fc-26-ps5' $$,
  '23514',
  null,
  'only PEGI ratings (3, 7, 12, 16, 18) are allowed'
);

select * from finish();
rollback;
