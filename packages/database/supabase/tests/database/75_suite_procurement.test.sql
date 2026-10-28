-- The IDEA Suite procurement: requests, quotes, purchase orders and invoices.
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

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- O owns the company, M is a member, X is outside it, S support, F finance.
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000075a1', 'po@example.iq', '{"full_name":"Owner O"}'),
  ('00000000-0000-0000-0000-0000000075a2', 'pm@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-0000000075a3', 'px@example.iq', '{"full_name":"Outsider X"}'),
  ('00000000-0000-0000-0000-0000000075a4', 'ps@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-0000000075a5', 'pf@example.iq', '{"full_name":"Finance F"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000075a4', 'support'),
  ('00000000-0000-0000-0000-0000000075a5', 'finance');

insert into public.organizations (id, name, slug, created_by) values
  ('75000000-0000-0000-0000-0000000000c1', 'Acme', 'acme-procurement', '00000000-0000-0000-0000-0000000075a1');
insert into public.organization_members (organization_id, user_id, role) values
  ('75000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000075a1', 'owner'),
  ('75000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000075a2', 'member')
on conflict do nothing;

-- ── Requests ────────────────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000075a2');
select throws_ok(
  $$ insert into public.procurement_requests (organization_id, title) values ('75000000-0000-0000-0000-0000000000c1', 'Laptops') $$,
  '42501', null, 'members can''t send requests'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000075a1');
select lives_ok(
  $$ insert into public.procurement_requests (organization_id, title, budget) values ('75000000-0000-0000-0000-0000000000c1', '10 laptops', 9000000) $$,
  'owners send requests'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000075a3');
select is_empty($$ select * from public.procurement_requests $$, 'outsiders see nothing');
select pg_temp.login_as('00000000-0000-0000-0000-0000000075a2');
select is((select count(*)::integer from public.procurement_requests), 1, 'members see their company''s requests');

-- ── Quotes ──────────────────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000075a4', 'aal2');
insert into public.quotes (request_id, notes)
select id, 'Dell, delivered in a week' from public.procurement_requests where title = '10 laptops';
insert into public.quotes (request_id, notes)
select id, 'Alternative' from public.procurement_requests where title = '10 laptops';
select throws_ok(
  $$ select public.send_quote((select id from public.quotes where notes = 'Alternative')) $$,
  '23514', null, 'a quote needs a line'
);
insert into public.quote_lines (quote_id, description, quantity, unit_price)
select id, 'Dell Latitude', 10, 850000 from public.quotes where notes = 'Dell, delivered in a week';
insert into public.quote_lines (quote_id, description, quantity, unit_price)
select id, 'Lenovo ThinkPad', 10, 800000 from public.quotes where notes = 'Alternative';

select pg_temp.login_as('00000000-0000-0000-0000-0000000075a2');
select is_empty($$ select * from public.quotes $$, 'drafts stay with staff');

select pg_temp.login_as('00000000-0000-0000-0000-0000000075a4', 'aal2');
select public.send_quote((select id from public.quotes where notes = 'Dell, delivered in a week'));
select public.send_quote((select id from public.quotes where notes = 'Alternative'));
select is(
  (select count(*)::integer from public.quote_lines l join public.quotes q on q.id = l.quote_id where q.status = 'sent' and l.unit_price = 1),
  0,
  'sent quotes can''t be repriced'
);
update public.quote_lines set unit_price = 1
where quote_id = (select id from public.quotes where notes = 'Alternative');
select is(
  (select unit_price from public.quote_lines where description = 'Lenovo ThinkPad'),
  800000::bigint,
  'updates to a sent quote''s lines change nothing'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000075a2');
select is((select count(*)::integer from public.quotes), 2, 'members see sent quotes');
select is((select count(*)::integer from public.quote_lines), 2, 'and their lines');
select throws_ok(
  $$ select public.decide_quote((select id from public.quotes where notes = 'Alternative'), true) $$,
  '42501', null, 'members can''t accept quotes'
);
select pg_temp.reset_role();
select is(
  (select count(*)::integer from public.notifications where event = 'quote_sent' and user_id = '00000000-0000-0000-0000-0000000075a1'),
  2,
  'the owner hears about each quote'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000075a1');
select isnt(
  public.decide_quote((select id from public.quotes where notes = 'Dell, delivered in a week'), true, 'PO-123'),
  null,
  'owners accept a quote'
);
select results_eq(
  $$ select total, customer_reference, status::text from public.purchase_orders $$,
  $$ values (8500000::bigint, 'PO-123', 'open') $$,
  'it becomes a purchase order with the quote''s total'
);
select results_eq(
  $$ select status::text from public.quotes where notes = 'Alternative' $$,
  $$ values ('withdrawn') $$,
  'the other quote is withdrawn'
);
select throws_ok(
  $$ select public.decide_quote((select id from public.quotes where notes = 'Alternative'), true) $$,
  '23514', null, 'and can''t be accepted'
);
select is((select status::text from public.procurement_requests), 'ordered', 'the request is ordered');

-- ── Delivery and invoices ───────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000075a4', 'aal2');
select public.set_purchase_order_status((select id from public.purchase_orders), 'delivered');
select is((select status::text from public.procurement_requests), 'delivered', 'delivery closes the request');
select throws_ok(
  $$ select public.issue_invoice((select id from public.purchase_orders)) $$,
  '42501', null, 'only finance invoices'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000075a5', 'aal2');
select public.issue_invoice((select id from public.purchase_orders), 30);
select results_eq(
  $$ select amount, status::text from public.invoices $$,
  $$ values (8500000::bigint, 'issued') $$,
  'finance issues the invoice for the order''s total'
);
select public.set_invoice_status((select id from public.invoices), 'paid');
select pg_temp.login_as('00000000-0000-0000-0000-0000000075a2');
select results_eq(
  $$ select status::text from public.invoices $$,
  $$ values ('paid') $$,
  'members see the paid invoice'
);
select pg_temp.reset_role();

select * from finish();
rollback;
