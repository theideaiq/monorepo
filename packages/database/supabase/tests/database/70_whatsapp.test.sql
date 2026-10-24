-- WhatsApp settings, the WhatsApp queue and rental reminders. Run with
-- `bun run db:test`.
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

select plan(14);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- U and V are customers, S is support.

delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'wa-u@example.iq', '{"full_name":"Uday Kareem","locale":"en"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'wa-v@example.iq', '{"full_name":"Vian"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'wa-s@example.iq', '{"full_name":"Support Sara"}');

insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000000e3', 'support');

-- ── Settings ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select lives_ok(
  $$ update public.profiles set whatsapp_phone = '+9647701234567', whatsapp_opt_in = true
     where id = '00000000-0000-0000-0000-0000000000e1' $$,
  'customers opt in with their WhatsApp number'
);
select results_eq(
  $$ select phone, opt_in from public.my_whatsapp_settings() $$,
  $$ values ('+9647701234567'::text, true) $$,
  'customers read their settings back'
);
select throws_ok(
  $$ select whatsapp_phone from public.profiles $$,
  '42501', null, 'the number column is not selectable; my_whatsapp_settings reads it'
);
select is(
  (select whatsapp_opt_in from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'),
  true, 'the consent is readable like marketing_opt_in'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e2');
select throws_ok(
  $$ update public.profiles set whatsapp_opt_in = true where id = '00000000-0000-0000-0000-0000000000e2' $$,
  '23514', null, 'opting in needs a number'
);
select throws_ok(
  $$ update public.profiles set whatsapp_phone = '+15551234567' where id = '00000000-0000-0000-0000-0000000000e2' $$,
  '23514', null, 'WhatsApp numbers are Iraqi mobiles in E.164'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e3', 'aal2');
select is_empty(
  $$ select * from public.my_whatsapp_settings() where phone is not null $$,
  'staff only read their own settings'
);

-- ── Queue ───────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok(
  $$ select * from public.claim_whatsapp_notifications() $$,
  '42501', null, 'customers cannot claim WhatsApp messages'
);

select pg_temp.reset_role();
truncate public.notifications;
insert into public.notifications (id, user_id, kind, event, data, link) values
  ('71000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', 'order', 'order_paid', '{"number":10042}', '/orders/view?id=1'),
  ('71000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e1', 'order', 'order_processing', '{"number":10042}', null),
  ('71000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000e2', 'order', 'order_shipped', '{"number":10043}', null);

set local role service_role;
select results_eq(
  $$ select id::text, phone, locale, first_name from public.claim_whatsapp_notifications() $$,
  $$ values ('71000000-0000-0000-0000-000000000001', '+9647701234567', 'en', 'Uday') $$,
  'only templated events for opted-in customers, with their number, language and first name'
);
select is(
  (select count(*)::int from public.claim_whatsapp_notifications()),
  0, 'a claimed notification is never sent twice'
);

-- ── Rentals due soon ────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok(
  $$ select public.notify_rentals_due_soon() $$,
  '42501', null, 'customers cannot send reminders'
);

select pg_temp.reset_role();
truncate public.rentals cascade;
insert into public.rentals (id, user_id, name_ar, name_en, status, started_at, due_at) values
  ('72000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', 'لعبة', 'Game', 'active', now() - interval '13 days', now() + interval '1 day'),
  ('72000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e1', 'كتاب', 'Book', 'active', now() - interval '9 days', now() + interval '5 days');

set local role service_role;
select is(public.notify_rentals_due_soon(), 1, 'rentals due within two days get a reminder');
select is(public.notify_rentals_due_soon(), 0, 'one reminder per due date');

select pg_temp.reset_role();
update public.rentals set due_at = due_at + interval '1 day'
where id = '72000000-0000-0000-0000-000000000001';
select is(
  (select due_reminder_at from public.rentals where id = '72000000-0000-0000-0000-000000000001'),
  null, 'a new due date gets a new reminder'
);

select * from finish();
rollback;
