-- Every sign-in method through Supabase Auth: phones Supabase confirms are
-- kept as verified, a Telegram identity links the bot account, and Telegram
-- or a phone can't start a Pass without an email.
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

select plan(11);

truncate public.telegram_members, public.bulb_entries cascade;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000af1', 'af1@example.iq'),
  ('00000000-0000-0000-0000-000000000af2', 'af2@example.iq');

-- Phones: each number Supabase confirms is kept.
update auth.users set phone = '9647700001001', phone_confirmed_at = now()
where id = '00000000-0000-0000-0000-000000000af1';
update auth.users set phone = '9647700001002', phone_confirmed_at = now()
where id = '00000000-0000-0000-0000-000000000af1';
select results_eq(
  $$ select phone from public.verified_phones
     where user_id = '00000000-0000-0000-0000-000000000af1' order by phone $$,
  array['+9647700001001', '+9647700001002'],
  'every number Supabase confirms stays verified'
);
update auth.users set phone = '9647700001003', phone_confirmed_at = null
where id = '00000000-0000-0000-0000-000000000af2';
select is_empty(
  $$ select 1 from public.verified_phones
     where user_id = '00000000-0000-0000-0000-000000000af2' $$,
  'an unconfirmed number is not'
);

-- Email once: no Pass starts with Telegram or a phone alone.
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000af3');
select throws_ok(
  $$ insert into auth.identities (provider_id, user_id, identity_data, provider)
     values ('tg-sub-3', '00000000-0000-0000-0000-000000000af3', '{"custom_claims":{"id":7003}}', 'custom:telegram') $$,
  '23514', 'Sign in with your email first', 'Telegram alone does not start a Pass'
);
select throws_ok(
  $$ insert into auth.identities (provider_id, user_id, identity_data, provider)
     values ('00000000-0000-0000-0000-000000000af3', '00000000-0000-0000-0000-000000000af3', '{}', 'phone') $$,
  '23514', 'Sign in with your email first', 'nor does a phone alone'
);

-- Telegram identities link the bot account and pay the bonus once.
insert into auth.identities (provider_id, user_id, identity_data, provider)
values (
  'tg-sub-1', '00000000-0000-0000-0000-000000000af1',
  '{"preferred_username":"afone","given_name":"Af","custom_claims":{"id":7001}}',
  'custom:telegram'
);
select results_eq(
  $$ select id, username, first_name from public.telegram_members
     where user_id = '00000000-0000-0000-0000-000000000af1' $$,
  $$ values (7001::bigint, 'afone', 'Af') $$,
  'connecting Telegram links the bot account'
);
select is(
  (select count(*) from public.bulb_entries
   where user_id = '00000000-0000-0000-0000-000000000af1' and reason = 'telegram'),
  1::bigint, 'and earns the bonus'
);

update auth.identities set identity_data =
  '{"preferred_username":"afnew","given_name":"Af","custom_claims":{"id":7001}}'
where provider_id = 'tg-sub-1';
select is(
  (select username from public.telegram_members where id = 7001),
  'afnew', 'signing in again refreshes the username'
);
select is(
  (select count(*) from public.bulb_entries
   where user_id = '00000000-0000-0000-0000-000000000af1' and reason = 'telegram'),
  1::bigint, 'the bonus is paid once'
);

select throws_ok(
  $$ insert into auth.identities (provider_id, user_id, identity_data, provider)
     values ('tg-sub-2', '00000000-0000-0000-0000-000000000af2', '{"custom_claims":{"id":7001}}', 'custom:telegram') $$,
  '23505', 'Telegram linked elsewhere', 'a Telegram account linked to another Pass is refused'
);

-- Without the id claim the sign-in still works, unlinked.
select lives_ok(
  $$ insert into auth.identities (provider_id, user_id, identity_data, provider)
     values ('tg-sub-2b', '00000000-0000-0000-0000-000000000af2', '{}', 'custom:telegram') $$,
  'a Telegram identity without the id claim is accepted'
);

delete from auth.identities where provider_id = 'tg-sub-1';
select is_empty(
  $$ select 1 from public.telegram_members
     where user_id = '00000000-0000-0000-0000-000000000af1' $$,
  'unlinking the identity disconnects Telegram'
);

select * from finish();
rollback;
