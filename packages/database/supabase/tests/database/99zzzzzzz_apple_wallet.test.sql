-- Apple Wallet: the Pass card's fixed code, issued, replaced and turned off. Run with `bun run db:test`.
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

select plan(17);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- U and V are customers, P a support agent.
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'wu@example.iq', '{"full_name":"Wallet U"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'wv@example.iq', '{"full_name":"Wallet V"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'wp@example.iq', '{"full_name":"Support P"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a3', 'support');

insert into private.pass_secrets (user_id) values ('00000000-0000-0000-0000-0000000000a1');

-- Each wallet card issued below, as `IDEA:<member number>:W<code>`.
create temporary table issued (n int primary key, scanned text, serial uuid);
grant all on issued to public;

-- ── Issuing ─────────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select throws_ok(
  $$ select * from public.issue_wallet_card() $$,
  '42501', null, 'visitors have no wallet card'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is(public.my_wallet_card(), null, 'no wallet card until one is added');
insert into issued
select 1, 'IDEA:' || member_number || ':W' || token, serial from public.issue_wallet_card();
select ok(
  (select scanned ~ '^IDEA:[0-9]+:W[0-9a-f]{30}$' from issued where n = 1),
  'the card gets a fixed code of 30 hex digits'
);
select ok(public.my_wallet_card() is not null, 'the member sees when it was added');
select throws_ok(
  $$ select * from private.wallet_cards $$,
  '42501', null, 'nobody reads the wallet cards table directly'
);

-- ── Checking it ─────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3', 'aal2');
select results_eq(
  $$ select valid, full_name, card from public.check_pass((select scanned from issued where n = 1)) $$,
  $$ values (true, 'Wallet U'::text, 'wallet'::text) $$,
  'the counter accepts the fixed code and says it is a wallet card'
);

select pg_temp.reset_role();
create temporary table live as
select 'IDEA:' || p.member_number || ':'
  || private.pass_code(s.secret, floor(extract(epoch from now()) / 30)::bigint) as scanned
from public.profiles p
join private.pass_secrets s on s.user_id = p.id
where p.id = '00000000-0000-0000-0000-0000000000a1';
grant select on live to public;

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3', 'aal2');
select results_eq(
  $$ select valid, card from public.check_pass((select scanned from live)) $$,
  $$ values (true, 'live'::text) $$,
  'the 30-second code still works, as a live card'
);
select is(
  (select valid from public.check_pass('IDEA:100001:Wnot-a-code')),
  false, 'a malformed code is refused'
);

select pg_temp.reset_role();
select is(
  private.pass_holder((select scanned from issued where n = 1)),
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  'perks and partners read the same holder'
);
select is(
  private.pass_holder(
    'IDEA:' || (select member_number from public.profiles where id = '00000000-0000-0000-0000-0000000000a2')
    || ':' || split_part((select scanned from issued where n = 1), ':', 3)
  ),
  null, 'the code works only with its own member number'
);

-- ── Adding it again, and turning it off ─────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
insert into issued
select 2, 'IDEA:' || member_number || ':W' || token, serial from public.issue_wallet_card();

select pg_temp.reset_role();
select is(
  private.pass_holder((select scanned from issued where n = 1)),
  null, 'adding the card again stops the one before'
);
select is(
  private.pass_holder((select scanned from issued where n = 2)),
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  'and the new one works'
);
select isnt(
  (select serial from issued where n = 2),
  (select serial from issued where n = 1),
  'with a new serial number in Apple Wallet'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select public.remove_wallet_card();
select is(public.my_wallet_card(), null, 'the member turns the card off');
select pg_temp.reset_role();
select is(
  private.pass_holder((select scanned from issued where n = 2)),
  null, 'and its code stops working'
);

-- ── A suspended Pass ────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
insert into issued
select 3, 'IDEA:' || member_number || ':W' || token, serial from public.issue_wallet_card();
select pg_temp.reset_role();
update public.profiles set banned_at = now() where id = '00000000-0000-0000-0000-0000000000a2';
select is(
  private.pass_holder((select scanned from issued where n = 3)),
  null, 'a suspended Pass''s wallet card is refused'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok(
  $$ select * from public.issue_wallet_card() $$,
  '42501', null, 'and it gets no new one'
);

select * from finish();
rollback;
