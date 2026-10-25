-- The IDEA Pass card: member numbers and the 30-second code. Run with `bun run db:test`.
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

select plan(12);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- U and V are customers, P a support agent.
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'pu@example.iq', '{"full_name":"Customer U"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'pv@example.iq', '{"full_name":"Customer V"}'),
  ('00000000-0000-0000-0000-0000000000f3', 'pp@example.iq', '{"full_name":"Support P"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000f3', 'support');

-- ── The code (RFC 6238, appendix B: SHA-1, T = 59 s and 1111111109 s) ──────

select is(
  private.pass_code(convert_to('12345678901234567890', 'UTF8'), 1),
  '287082', 'the code matches the RFC 6238 test vector at 59 seconds'
);
select is(
  private.pass_code(convert_to('12345678901234567890', 'UTF8'), 37037036),
  '081804', 'and at 1111111109 seconds'
);

-- ── Member numbers and secrets ──────────────────────────────────────────────

select ok(
  (select count(distinct member_number) = count(*) and min(member_number) >= 100001
   from public.profiles where id::text like '00000000-0000-0000-0000-0000000000f%'),
  'every member gets their own member number'
);

select pg_temp.login_anon();
select throws_ok(
  $$ select * from public.my_pass_secret() $$,
  '42501', null, 'visitors have no card'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f1');
select ok(
  (select secret ~ '^[0-9a-f]{40}$' from public.my_pass_secret()),
  'members get a 20-byte secret, as hex'
);
select is(
  (select secret from public.my_pass_secret()),
  (select secret from public.my_pass_secret()),
  'the secret stays the same'
);
select throws_ok(
  $$ select * from private.pass_secrets $$,
  '42501', null, 'nobody reads the secrets table directly'
);

-- ── Checking a card at the counter ──────────────────────────────────────────

select pg_temp.reset_role();
create temporary table card as
select
  p.member_number,
  'IDEA:' || p.member_number || ':'
    || private.pass_code(s.secret, floor(extract(epoch from now()) / 30)::bigint) as current_code,
  'IDEA:' || p.member_number || ':'
    || private.pass_code(s.secret, floor(extract(epoch from now()) / 30)::bigint - 10) as old_code
from public.profiles p
join private.pass_secrets s on s.user_id = p.id
where p.id = '00000000-0000-0000-0000-0000000000f1';
grant select on card to public;

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f2');
select throws_ok(
  $$ select * from public.check_pass((select current_code from card)) $$,
  '42501', null, 'customers cannot check cards'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f3', 'aal1');
select throws_ok(
  $$ select * from public.check_pass((select current_code from card)) $$,
  '42501', null, 'support needs an authenticator-app session'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f3', 'aal2');
select results_eq(
  $$ select valid, full_name from public.check_pass((select current_code from card)) $$,
  $$ values (true, 'Customer U'::text) $$,
  'the current code is accepted and names the member'
);
select is(
  (select valid from public.check_pass((select old_code from card))),
  false, 'a code from five minutes ago (a screenshot) is refused'
);
select is(
  (select valid from public.check_pass('IDEA:999999999:123456')),
  false, 'an unknown member number is refused'
);

select * from finish();
rollback;
