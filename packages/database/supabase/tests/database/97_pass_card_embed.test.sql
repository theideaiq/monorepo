-- The live Pass card on a partner's site (theideaiq.com/pass/embed).
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

select plan(21);

-- O owns Sal (M a member), X is someone else, S is support.
delete from public.staff;
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000971', 'o97@example.iq', now()),
  ('00000000-0000-0000-0000-000000000972', 'm97@example.iq', now()),
  ('00000000-0000-0000-0000-000000000973', 'x97@example.iq', now()),
  ('00000000-0000-0000-0000-000000000974', 's97@example.iq', now());
update public.profiles set full_name = 'Omar', birthday = date '1990-01-01'
where id in ('00000000-0000-0000-0000-000000000971', '00000000-0000-0000-0000-000000000972', '00000000-0000-0000-0000-000000000973');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000974', 'support');
insert into public.organizations (id, name, slug, created_by) values
  ('97000000-0000-0000-0000-0000000000c1', 'Sal', 'sal', '00000000-0000-0000-0000-000000000971');
insert into public.organization_members (organization_id, user_id, role) values
  ('97000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000971', 'owner'),
  ('97000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000972', 'member');
create temporary table made (client text, token text);
grant all on made to authenticated, anon;

select pg_temp.login_as('00000000-0000-0000-0000-000000000971');
select public.add_pass_domain('97000000-0000-0000-0000-0000000000c1', 'sal.iq');
select pg_temp.reset_role();
update public.pass_partner_domains set verified_at = now()
where organization_id = '97000000-0000-0000-0000-0000000000c1';

select pg_temp.login_as('00000000-0000-0000-0000-000000000971');
insert into made (client)
select public.create_pass_app('97000000-0000-0000-0000-0000000000c1', 'Sal', 'https://sal.iq',
  '{https://sal.iq/cb}', '{profile,card_embed}') ->> 'client_id';

-- ── The site ──
select pg_temp.login_anon();
select results_eq(
  format($$ select name, origins from public.pass_card_embed_site(%L) $$, (select client from made)),
  $$ values ('Sal', '{https://*.sal.iq,https://sal.iq}'::text[]) $$,
  'anyone reads which origins may frame it');
select is(
  (select count(*)::int from public.pass_card_embed_site('pass_unknown')), 0, 'unknown apps have none');
select throws_ok(
  format($$ select public.start_pass_card_embed(%L) $$, (select client from made)),
  '42501', null, 'visitors can''t start one');

-- ── Testing: the company's members only ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000973');
select throws_ok(
  format($$ select public.start_pass_card_embed(%L) $$, (select client from made)),
  '42501', null, 'others can''t while it''s in testing');
select pg_temp.login_as('00000000-0000-0000-0000-000000000972');
update made set token = public.start_pass_card_embed(client);
select matches((select token from made), '^[0-9a-f]{64}$', 'members get a token');
select pg_temp.reset_role();
select is(
  (select token_hash from public.pass_card_embeds where user_id = '00000000-0000-0000-0000-000000000972'),
  (select private.sha256_hex(token) from made), 'only its hash is kept');

-- ── The frame reads the card and the code ──
select pg_temp.login_anon();
create temporary table shown as
  select public.pass_card_embed(client, token) as card from made;
select pg_temp.reset_role();
select is((select card ->> 'name' from shown), 'Omar', 'the card');
select is(
  (select card ->> 'code' from shown),
  (select private.pass_code(s.secret, (select (card ->> 'step')::bigint from shown))
   from private.pass_secrets s where s.user_id = '00000000-0000-0000-0000-000000000972'),
  'the current code, computed here');
select is(
  (select card ->> 'next_code' from shown),
  (select private.pass_code(s.secret, (select (card ->> 'step')::bigint + 1 from shown))
   from private.pass_secrets s where s.user_id = '00000000-0000-0000-0000-000000000972'),
  'and the next one');
select isnt((select last_shown_at from public.pass_card_embeds where user_id = '00000000-0000-0000-0000-000000000972'),
  null, 'when it was last shown');
select pg_temp.login_anon();
select is(
  public.pass_card_embed((select client from made), repeat('0', 64)), null, 'a wrong token reads nothing');
select is(
  public.pass_card_embed('pass_unknown', (select token from made)), null, 'nor another site');
select throws_ok($$ select * from public.pass_card_embeds $$, '42501', null, 'visitors can''t list them');

-- ── Members see their own ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000972');
select is((select count(*)::int from public.pass_card_embeds), 1, 'the member sees it');
select throws_ok($$ select token_hash from public.pass_card_embeds $$, '42501', null, 'but not the hash');
select pg_temp.login_as('00000000-0000-0000-0000-000000000973');
select is((select count(*)::int from public.pass_card_embeds), 0, 'others don''t');

-- ── Live: waits for review ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000971');
select public.set_pass_app_state((select client from made), true, true);
select pg_temp.login_anon();
select is(
  public.pass_card_embed((select client from made), (select token from made)), null,
  'live but not reviewed, the frame shows nothing');
select is(
  (select count(*)::int from public.pass_card_embed_site((select client from made))), 0,
  'and no one may frame it');
select pg_temp.login_as('00000000-0000-0000-0000-000000000974', 'aal2');
select public.review_pass_app((select client from made), true);
select pg_temp.login_anon();
select isnt(
  public.pass_card_embed((select client from made), (select token from made)), null, 'approved, it shows again');

-- ── Stopping ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000972');
select public.end_pass_card_embed((select client from made));
select pg_temp.login_anon();
select is(
  public.pass_card_embed((select client from made), (select token from made)), null, 'stopped in Settings');

select pg_temp.login_as('00000000-0000-0000-0000-000000000973');
update made set token = public.start_pass_card_embed(client);
select pg_temp.reset_role();
insert into public.pass_connections (user_id, client_id, scopes)
values ('00000000-0000-0000-0000-000000000973', (select client from made), '{profile}');
select pg_temp.login_as('00000000-0000-0000-0000-000000000973');
select public.disconnect_pass_partner((select client from made));
select pg_temp.reset_role();
select is(
  (select count(*)::int from public.pass_card_embeds where user_id = '00000000-0000-0000-0000-000000000973'),
  0, 'disconnecting the site stops it too');

select * from finish();
rollback;
