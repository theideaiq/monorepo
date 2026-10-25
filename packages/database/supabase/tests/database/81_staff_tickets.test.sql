-- Plans have Arabic names; support staff open tickets for customers.
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

delete from public.staff;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000081a1', 'tm@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-0000000081a2', 'ts@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-0000000081a3', 'te@example.iq', '{"full_name":"Editor E"}'),
  ('00000000-0000-0000-0000-0000000081a4', 'to@example.iq', '{"full_name":"Other O"}');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000081a2', 'support'),
  ('00000000-0000-0000-0000-0000000081a3', 'editor');

insert into public.orders (id, user_id, status, subtotal, total, shipping_address) values
  ('81000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000081a1', 'paid', 10000, 10000,
    '{"full_name":"M","phone":"+9647700000111","governorate":"baghdad","city":"الكرادة","address":"Street 1"}'),
  ('81000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000081a4', 'paid', 10000, 10000,
    '{"full_name":"O","phone":"+9647700000112","governorate":"baghdad","city":"الكرادة","address":"Street 2"}');

-- ── Arabic plan names ──────────────────────────────────────────────────────

insert into public.plans (id, name, name_ar, amount, billing_interval, audience, rental_slots, tier)
values ('plus-names-test', 'Plus Test', 'بلس تجريبي', 15000, 'month', 'plus', 1, 1);

select pg_temp.login_anon();
select is(
  (select name_ar from public.plans where id = 'plus-names-test'),
  'بلس تجريبي', 'visitors read a plan''s Arabic name'
);
select pg_temp.reset_role();

-- ── Tickets opened by staff ────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000081a1');
select throws_ok(
  $$ select public.open_support_ticket_for('00000000-0000-0000-0000-0000000081a4', 'Hi', 'Hello') $$,
  '42501', null, 'customers cannot open tickets for others'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000081a3', 'aal2');
select throws_ok(
  $$ select public.open_support_ticket_for('00000000-0000-0000-0000-0000000081a1', 'Hi', 'Hello') $$,
  '42501', null, 'staff outside support cannot open tickets for customers'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000081a2');
select throws_ok(
  $$ select public.open_support_ticket_for('00000000-0000-0000-0000-0000000081a1', 'Hi', 'Hello') $$,
  '42501', null, 'support needs an authenticator-app session'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000081a2', 'aal2');
select throws_ok(
  $$ select public.open_support_ticket_for('00000000-0000-0000-0000-0000000081a1', 'Hi', 'Hello', 'order',
       '81000000-0000-0000-0000-000000000002') $$,
  'P0002', null, 'the order must be the customer''s'
);
select throws_ok(
  $$ select public.open_support_ticket_for('00000000-0000-0000-0000-0000000081ff', 'Hi', 'Hello') $$,
  'P0002', null, 'the customer must exist'
);

select lives_ok(
  $$ select public.open_support_ticket_for('00000000-0000-0000-0000-0000000081a1', 'Your order is late',
       'Sorry, your order will arrive tomorrow.', 'order', '81000000-0000-0000-0000-000000000001') $$,
  'support opens a ticket for a customer'
);
select pg_temp.reset_role();

select results_eq(
  $$ select user_id, status::text, topic::text, order_id, assigned_to from public.support_tickets
     where subject = 'Your order is late' $$,
  $$ values ('00000000-0000-0000-0000-0000000081a1'::uuid, 'pending', 'order',
       '81000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-0000000081a2'::uuid) $$,
  'the ticket is the customer''s, assigned to its opener, and waits on the customer'
);
select results_eq(
  $$ select m.author_id, m.internal from public.support_messages m
     join public.support_tickets t on t.id = m.ticket_id where t.subject = 'Your order is late' $$,
  $$ values ('00000000-0000-0000-0000-0000000081a2'::uuid, false) $$,
  'its first message is the staff member''s, visible to the customer'
);
select is(
  (select count(*)::integer from public.notifications
   where user_id = '00000000-0000-0000-0000-0000000081a1' and event = 'support_reply'),
  1, 'the customer is notified'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000081a1');
select is(
  (select count(*)::integer from public.support_tickets where subject = 'Your order is late'),
  1, 'the customer sees the ticket'
);
select lives_ok(
  $$ insert into public.support_messages (ticket_id, author_id, body)
     select id, '00000000-0000-0000-0000-0000000081a1', 'Thanks' from public.support_tickets
     where subject = 'Your order is late' $$,
  'the customer replies on it'
);

select * from finish();
rollback;
