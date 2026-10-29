-- Telegram sign-in and linking: link_telegram (API only), the bonus, my_telegram and unlinking.
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
select plan(9);

truncate public.telegram_members, public.bulb_entries cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'tg1@example.iq', '{"full_name":"Telegram One"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'tg2@example.iq', '{"full_name":"Telegram Two"}');

-- Members can't link an account themselves: only the API, after checking
-- Telegram's ID token.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok(
  $$ select public.link_telegram(auth.uid(), 5001, 'one', 'One', null) $$,
  '42501', null, 'members cannot link a Telegram account directly'
);

select pg_temp.reset_role();
select public.link_telegram('00000000-0000-0000-0000-0000000000e1', 5001, 'one', 'One', null);
select is(
  (select user_id from public.telegram_members where id = 5001),
  '00000000-0000-0000-0000-0000000000e1'::uuid, 'the API links a verified account'
);
select results_eq(
  $$ select amount, status::text from public.bulb_entries
     where user_id = '00000000-0000-0000-0000-0000000000e1' and reason = 'telegram' $$,
  $$ values (1000, 'available') $$,
  'connecting Telegram earns 1,000 Bulbs'
);

select throws_ok(
  $$ select public.link_telegram('00000000-0000-0000-0000-0000000000e2', 5001, 'one', 'One', null) $$,
  '23505', 'Telegram linked elsewhere', 'an account linked to someone else is refused'
);

-- Linking another account replaces the first; the bonus is paid once.
select public.link_telegram('00000000-0000-0000-0000-0000000000e1', 5002, 'uno', 'Uno', null);
select results_eq(
  $$ select id from public.telegram_members where user_id = '00000000-0000-0000-0000-0000000000e1' $$,
  $$ values (5002::bigint) $$,
  'a member has one linked Telegram account'
);
select is(
  (select count(*) from public.bulb_entries
   where user_id = '00000000-0000-0000-0000-0000000000e1' and reason = 'telegram'),
  1::bigint, 'the bonus is paid once'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select results_eq(
  $$ select username, first_name from public.my_telegram() $$,
  $$ values ('uno', 'Uno') $$,
  'members see their linked account'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e2');
select is_empty($$ select * from public.my_telegram() $$, 'and nobody else''s');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select public.unlink_telegram();
select is_empty($$ select * from public.my_telegram() $$, 'members disconnect Telegram');

select * from finish();
rollback;
