-- Program revision v1, step 1: Droid's FAQ topics and /r/<code>.
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
select plan(7);

-- ── FAQ topics ─────────────────────────────────────────────────────────────

select lives_ok(
  $$ insert into public.telegram_faq (topic, question_ar, question_en, answer_ar, answer_en)
     values ('business', 'س', 'Q', 'ج', 'A') $$,
  'business is an FAQ topic'
);
select throws_ok(
  $$ insert into public.telegram_faq (topic, question_ar, question_en, answer_ar, answer_en)
     values ('suite', 'س', 'Q', 'ج', 'A') $$,
  '23514', null, 'suite is not'
);

-- ── /r/<code> ──────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000083a1', 'r1@example.iq'),
  ('00000000-0000-0000-0000-0000000083a2', 'r2@example.iq');
update public.profiles set invite_code = 'friend83' where id = '00000000-0000-0000-0000-0000000083a1';
insert into public.affiliates (user_id, code, status, pitch) values
  ('00000000-0000-0000-0000-0000000083a2', 'CREATOR83', 'approved', 'My channel');

select pg_temp.login_anon();
select is(public.referral_kind('friend83'), 'invite', 'a member''s invite code');
select is(public.referral_kind(' FRIEND83 '), 'invite', 'retyped in capitals');
select is(public.referral_kind('creator83'), 'affiliate', 'an approved affiliate''s code');
select is(public.referral_kind('nobody'), null, 'an unknown code');
select pg_temp.reset_role();

update public.affiliates set status = 'suspended' where code = 'CREATOR83';
select is(public.referral_kind('CREATOR83'), null, 'a suspended affiliate''s link is no longer one');

select * from finish();
rollback;
