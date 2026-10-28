-- Sign in with The IDEA Pass: companies register their own apps.
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

select plan(34);

-- O owns Cedar (with M a member), X is someone else, S is support.
delete from public.staff;
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000951', 'o@example.iq', now()),
  ('00000000-0000-0000-0000-000000000952', 'm@example.iq', now()),
  ('00000000-0000-0000-0000-000000000953', 'x@example.iq', now()),
  ('00000000-0000-0000-0000-000000000954', 's@example.iq', now());
update public.profiles set full_name = 'Omar', birthday = date '1990-01-01'
where id in ('00000000-0000-0000-0000-000000000951', '00000000-0000-0000-0000-000000000952', '00000000-0000-0000-0000-000000000953');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000954', 'support');
insert into public.organizations (id, name, slug, created_by) values
  ('95000000-0000-0000-0000-0000000000c1', 'Cedar', 'cedar', '00000000-0000-0000-0000-000000000951');
insert into public.organization_members (organization_id, user_id, role) values
  ('95000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000951', 'owner'),
  ('95000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000952', 'member');
create temporary table made (client text, secret text, domain uuid);
grant all on made to authenticated;

-- ── Domains ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000952');
select throws_ok($$ select public.add_pass_domain('95000000-0000-0000-0000-0000000000c1', 'cedar.iq') $$,
  '42501', null, 'members can''t add domains');
select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
select throws_ok($$ select public.add_pass_domain('95000000-0000-0000-0000-0000000000c1', 'shop.theideaiq.com') $$,
  '23514', null, 'not ours');
select throws_ok($$ select public.add_pass_domain('95000000-0000-0000-0000-0000000000c1', 'not a domain') $$,
  '23514', null, 'a real domain name');
insert into made (domain) select (public.add_pass_domain('95000000-0000-0000-0000-0000000000c1', ' Cedar.IQ. ')).id;
select is((select domain from public.pass_partner_domains), 'cedar.iq', 'kept in lower case');
select is((select char_length(token) from public.pass_partner_domains), 32, 'with a token to publish');
select throws_ok($$ update public.pass_partner_domains set verified_at = now() $$,
  '42501', null, 'companies can''t mark it verified');
select throws_ok(
  $$ select public.create_pass_app('95000000-0000-0000-0000-0000000000c1', 'Cedar', 'https://cedar.iq',
       '{https://cedar.iq/cb}', '{profile,email}') $$,
  '23514', 'The website isn''t on a verified domain', 'apps need a verified domain');

-- The API verifies it.
select pg_temp.reset_role();
update public.pass_partner_domains set verified_at = now();

-- ── Apps ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
select throws_ok(
  $$ select public.create_pass_app('95000000-0000-0000-0000-0000000000c1', 'Cedar', 'https://cedar.iq',
       '{https://evil.example/cb}', '{profile}') $$,
  '23514', 'A return address isn''t on a verified domain', 'return addresses on verified domains');
insert into made (client, secret)
select r ->> 'client_id', r ->> 'client_secret' from (
  select public.create_pass_app('95000000-0000-0000-0000-0000000000c1', 'Cedar Books', 'https://cedar.iq',
    '{https://app.cedar.iq/cb,http://localhost:3000/cb}', '{profile,email,student,student_email,phone}') as r
) x;
select matches((select client from made where client is not null), '^pass_[0-9a-f]{24}$', 'a client id');
select throws_ok(
  $$ select secret_hash from public.pass_partners $$,
  '42501', null, 'the secret''s hash can''t be read');
select pg_temp.reset_role();
select is(
  (select p.secret_hash from public.pass_partners p join made m on m.client = p.client_id),
  (select private.sha256_hex(secret) from made where secret is not null), 'only its hash is kept');
select results_eq(
  $$ select mode, answers, review_status from public.pass_partners p join made m on m.client = p.client_id $$,
  $$ values ('testing', '{email,phone,profile,student,student_email}'::text[], 'pending') $$,
  'in testing it asks everything; the sensitive answers wait for review');

-- ── Testing: the company's members only ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000953');
select throws_ok(
  format($$ select public.approve_pass_sign_in(%L, 'https://app.cedar.iq/cb', '{openid,profile}', repeat('x', 43)) $$,
    (select client from made where client is not null)),
  '42501', 'This site is in testing', 'others can''t sign in to a testing app');
select pg_temp.login_as('00000000-0000-0000-0000-000000000952');
select lives_ok(
  format($$ select public.approve_pass_sign_in(%L, 'https://app.cedar.iq/cb', '{openid,profile,phone}', repeat('x', 43)) $$,
    (select client from made where client is not null)),
  'members can');
select is(
  (select count(*)::int from public.pass_apps('95000000-0000-0000-0000-0000000000c1')), 1, 'members see the apps');
select throws_ok(
  format($$ select public.rotate_pass_app_secret(%L) $$, (select client from made where client is not null)),
  '42501', null, 'only owners and admins manage them');
select pg_temp.login_as('00000000-0000-0000-0000-000000000953');
select throws_ok($$ select * from public.pass_apps('95000000-0000-0000-0000-0000000000c1') $$,
  '42501', null, 'others don''t');

-- ── Live: sensitive answers wait for review ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
select lives_ok(
  format($$ select public.set_pass_app_state(%L, true, true) $$, (select client from made where client is not null)),
  'the company takes it live');
select is(
  (select answers from public.pass_partners p join made m on m.client = p.client_id),
  '{email,profile,student}'::text[], 'live, it asks only the basic answers until review');
select pg_temp.login_as('00000000-0000-0000-0000-000000000953');
select lives_ok(
  format($$ select public.approve_pass_sign_in(%L, 'https://app.cedar.iq/cb', '{openid,profile}', repeat('x', 43)) $$,
    (select client from made where client is not null)),
  'everyone can sign in to a live app');
select throws_ok(
  format($$ select public.approve_pass_sign_in(%L, 'https://app.cedar.iq/cb', '{openid,phone}', repeat('x', 43)) $$,
    (select client from made where client is not null)),
  '23514', null, 'but not share what isn''t approved');
select pg_temp.reset_role();
select is(
  public.pass_claims('00000000-0000-0000-0000-000000000952', (select client from made where client is not null), '{openid,profile,phone}') ? 'phone_number',
  false, 'an earlier grant stops answering what isn''t approved');

select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
select throws_ok(
  format($$ select public.review_pass_app(%L, true) $$, (select client from made where client is not null)),
  '42501', null, 'companies can''t approve themselves');
select pg_temp.login_as('00000000-0000-0000-0000-000000000954', 'aal2');
select is((select count(*)::int from public.pass_apps() where review_status = 'pending'), 1, 'support sees the review');
select lives_ok(
  format($$ select public.review_pass_app(%L, true) $$, (select client from made where client is not null)),
  'support approves');
select pg_temp.reset_role();
select results_eq(
  $$ select answers, review_status from public.pass_partners p join made m on m.client = p.client_id $$,
  $$ values ('{email,phone,profile,student,student_email}'::text[], null::text) $$,
  'approved answers are asked');
select is(
  (select count(*)::int from public.notifications where event = 'pass_app_approved' and user_id = '00000000-0000-0000-0000-000000000951'),
  1, 'the owner hears');

-- Asking for something new goes back to review.
select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
select lives_ok(
  format($$ select public.update_pass_app(%L, 'Cedar Books', 'https://cedar.iq', '{https://app.cedar.iq/cb}',
    '{profile,email,student,student_email,phone,address}') $$, (select client from made where client is not null)),
  'the company asks for the address too');
select pg_temp.reset_role();
select results_eq(
  $$ select answers, review_status from public.pass_partners p join made m on m.client = p.client_id $$,
  $$ values ('{email,phone,profile,student,student_email}'::text[], 'pending'::text) $$,
  'the new answer waits; approved ones stay');

-- ── Secrets and keys ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
update made set secret = public.rotate_pass_app_secret((select client from made where client is not null)) where client is not null;
select pg_temp.reset_role();
select ok(
  (select previous_secret_until between now() + interval '23 hours' and now() + interval '25 hours'
   from public.pass_partners p join made m on m.client = p.client_id),
  'the previous secret works 24 more hours');
select pg_temp.login_as('00000000-0000-0000-0000-000000000951');
select throws_ok(
  format($$ select public.set_pass_app_keys(%L, '{"keys":[{"kty":"EC","crv":"P-256","x":"a","y":"b","d":"secret"}]}') $$,
    (select client from made where client is not null)),
  '23514', 'Invalid keys', 'no private keys');
select lives_ok(
  format($$ select public.set_pass_app_keys(%L, '{"keys":[{"kty":"EC","crv":"P-256","x":"a","y":"b","kid":"1"}]}') $$,
    (select client from made where client is not null)),
  'public keys');

-- ── Domains in use stay; staff suspend ──
select throws_ok(format($$ select public.remove_pass_domain(%L) $$, (select domain from made where domain is not null)),
  '23514', 'An app uses this domain', 'a domain an app uses stays');
select pg_temp.login_as('00000000-0000-0000-0000-000000000954', 'aal2');
select public.suspend_pass_app((select client from made where client is not null), true);
select is(
  (select active from public.pass_partners p join made m on m.client = p.client_id),
  false, 'suspended apps stop');

select * from finish();
rollback;
