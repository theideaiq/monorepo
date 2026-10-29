-- The IDEA's paid programs: packages, applications with the guardian's
-- approval, installments through the cart, refunds and passport scans.
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
select plan(26);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- A is an adult, T a 16-year-old with G as guardian, E an editor, F
-- finance, X someone else.
delete from public.staff;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a2c1', 'a9zzt@example.iq', '{"full_name":"Aya Salim"}'),
  ('00000000-0000-0000-0000-00000000a2c2', 't9zzt@example.iq', '{"full_name":"Taha"}'),
  ('00000000-0000-0000-0000-00000000a2c3', 'g9zzt@example.iq', '{"full_name":"Ghada"}'),
  ('00000000-0000-0000-0000-00000000a2c4', 'e9zzt@example.iq', '{}'),
  ('00000000-0000-0000-0000-00000000a2c5', 'f9zzt@example.iq', '{}'),
  ('00000000-0000-0000-0000-00000000a2c6', 'x9zzt@example.iq', '{}');
update public.profiles set birthday = date '1995-05-05'
where id in (
  '00000000-0000-0000-0000-00000000a2c1', '00000000-0000-0000-0000-00000000a2c3',
  '00000000-0000-0000-0000-00000000a2c6'
);
update public.profiles set birthday = current_date - interval '16 years'
where id = '00000000-0000-0000-0000-00000000a2c2';
insert into public.guardian_links (teen_id, guardian_id, status, accepted_at) values
  ('00000000-0000-0000-0000-00000000a2c2', '00000000-0000-0000-0000-00000000a2c3', 'active', now());
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-00000000a2c4', 'editor'),
  ('00000000-0000-0000-0000-00000000a2c5', 'finance');

-- The IDEA's summer program, starting in 60 days; an organization's too.
insert into public.organizations (id, name, slug, created_by, features) values
  ('9a6a0000-0000-0000-0000-0000000000a1', 'Tech Co', 'tech-9zzt', '00000000-0000-0000-0000-00000000a2c6', '{opportunities}');
insert into public.opportunities (id, organization_id, kind, title_ar, title_en, location, status, starts_on, ends_on) values
  ('9a6a0000-0000-0000-0000-0000000000b1', null, 'program', 'برنامج صيفي', 'Summer Program', 'Boston',
    'approved', current_date + 60, current_date + 80),
  ('9a6a0000-0000-0000-0000-0000000000b2', '9a6a0000-0000-0000-0000-0000000000a1', 'program', 'برنامج آخر',
    'Other Program', 'Erbil', 'approved', current_date + 60, null);

create temporary table made (name text primary key, value text);
grant all on made to anon, authenticated;

-- ── Programs ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c4', 'aal2');
select throws_ok(
  $$ insert into public.programs (opportunity_id, price)
     values ('9a6a0000-0000-0000-0000-0000000000b2', 100000) $$,
  '23514', 'Only The IDEA''s own programs are sold here',
  'only The IDEA''s own programs are packages'
);
select throws_ok(
  $$ insert into public.programs (opportunity_id, price, installments)
     values ('9a6a0000-0000-0000-0000-0000000000b1', 100000, '[{"percent": 60}, {"percent": 30, "due_on": "2030-01-01"}]') $$,
  '23514', null,
  'installments add up to 100%'
);
select throws_ok(
  $$ insert into public.programs (opportunity_id, price, min_age, chaperone)
     values ('9a6a0000-0000-0000-0000-0000000000b1', 100000, 13, false) $$,
  '23514', null,
  'under-18 groups travel with a chaperone'
);
select lives_ok(
  format(
    $f$ insert into public.programs (opportunity_id, price, seats, installments, refund_schedule, visa_refund_rate)
        values ('9a6a0000-0000-0000-0000-0000000000b1', 1000000, 1, %L, %L, 80) $f$,
    jsonb_build_array(
      jsonb_build_object('percent', 50),
      jsonb_build_object('percent', 50, 'due_on', current_date + 30)
    ),
    '[{"days_before": 30, "percent": 100}, {"days_before": 7, "percent": 50}]'
  ),
  'an editor sells it: two installments, refunds by date, 80% back on a refused visa'
);

select pg_temp.login_anon();
select is(
  (select price from public.programs),
  1000000::bigint, 'visitors see the listed program'
);

-- ── Applying ────────────────────────────────────────────────────────────────

select pg_temp.reset_role();
insert into storage.objects (bucket_id, name, owner) values
  ('program-documents', '00000000-0000-0000-0000-00000000a2c1/9a6a0000-0000-0000-0000-0000000000b1/passport.jpg',
    '00000000-0000-0000-0000-00000000a2c1'),
  ('program-documents', '00000000-0000-0000-0000-00000000a2c2/9a6a0000-0000-0000-0000-0000000000b1/passport.jpg',
    '00000000-0000-0000-0000-00000000a2c2');

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c1');
select throws_ok(
  $$ select public.apply_to_program('9a6a0000-0000-0000-0000-0000000000b1', 'Mum', '+9647700000101') $$,
  '23514', 'Add your passport',
  'the passport is needed'
);
select throws_ok(
  $$ select public.apply_to_program('9a6a0000-0000-0000-0000-0000000000b1', 'Mum', '+9647700000101', null,
       '{00000000-0000-0000-0000-00000000a2c2/9a6a0000-0000-0000-0000-0000000000b1/passport.jpg}') $$,
  '23514', 'Invalid documents',
  'only the applicant''s own scans'
);
insert into made select 'a', public.apply_to_program(
  '9a6a0000-0000-0000-0000-0000000000b1', 'Mum', '+9647700000101', 'I love science',
  '{00000000-0000-0000-0000-00000000a2c1/9a6a0000-0000-0000-0000-0000000000b1/passport.jpg}'
);
select results_eq(
  $$ select status, details ->> 'full_name', details ->> 'birthday', guardian_status
     from public.program_applications where id = (select value::uuid from made where name = 'a') $$,
  $$ values ('submitted', 'Aya Salim', '1995-05-05', null::text) $$,
  'an adult applies with details from the Pass'
);
select throws_ok(
  $$ select public.apply_to_program('9a6a0000-0000-0000-0000-0000000000b1', 'Mum', '+9647700000101', null,
       '{00000000-0000-0000-0000-00000000a2c1/9a6a0000-0000-0000-0000-0000000000b1/passport.jpg}') $$,
  '23505', 'You have already applied',
  'once per program'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c2');
insert into made select 't', public.apply_to_program(
  '9a6a0000-0000-0000-0000-0000000000b1', 'Ghada', '+9647700000103', null,
  '{00000000-0000-0000-0000-00000000a2c2/9a6a0000-0000-0000-0000-0000000000b1/passport.jpg}'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c6');
select is(
  (select count(*)::int from public.program_applications),
  0, 'others don''t see applications'
);

-- ── The guardian, then the review ───────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c4', 'aal2');
select throws_ok(
  $$ select public.review_program_application((select value::uuid from made where name = 't'), 'accepted') $$,
  '23514', 'The guardian hasn''t approved yet',
  'a minor''s guardian approves first'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c3');
select lives_ok(
  $$ select public.decide_program_guardian((select value::uuid from made where name = 't'), true) $$,
  'the guardian approves'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c4', 'aal2');
select public.review_program_application((select value::uuid from made where name = 'a'), 'accepted');
select results_eq(
  $$ select position, amount, due_on from public.program_payments
     where application_id = (select value::uuid from made where name = 'a') order by position $$,
  -- Due within the payment window from today in Baghdad; the second on its own date.
  $$ values (1::smallint, 500000::bigint, (now() at time zone 'Asia/Baghdad')::date + 7),
            (2::smallint, 500000::bigint, current_date + 30) $$,
  'accepting fixes the price in two installments'
);
select throws_ok(
  $$ select public.review_program_application((select value::uuid from made where name = 't'), 'accepted') $$,
  '23514', 'No seats left',
  'within the seats'
);
update public.programs set seats = 2;
select public.review_program_application((select value::uuid from made where name = 't'), 'accepted');

-- ── Paying through the cart ─────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c1');
insert into public.cart_programs (application_id) values ((select value::uuid from made where name = 'a'));
select results_eq(
  $$ select (q ->> 'program_total')::bigint, (q ->> 'ships')::boolean, (q ->> 'shipping_fee')::bigint,
       (q ->> 'total')::bigint, (q ->> 'bulbs_to_earn')::integer > 0
     from public.checkout_quote() q $$,
  $$ values (500000::bigint, false, 0::bigint, 500000::bigint, true) $$,
  'the next installment, nothing to deliver, and it earns Bulbs'
);
select throws_ok(
  $$ select public.create_order('{}', 'delivery', 'cash_on_delivery') $$,
  '23514', 'Programs are paid online',
  'never on delivery'
);
select throws_ok(
  $$ select public.create_gift_order(null) $$,
  '23514', 'Programs can''t be sent as gifts',
  'nor as a gift'
);
insert into made select 'a1', (public.create_order('{"full_name":"Aya","phone":"+9647700000101"}')).id;
select results_eq(
  $$ select i.kind, i.name_en, i.unit_price, o.total, o.status::text
     from public.order_items i join public.orders o on o.id = i.order_id
     where o.id = (select value::uuid from made where name = 'a1') $$,
  $$ values ('program', 'Summer Program · installment 1 of 2', 500000::bigint, 500000::bigint, 'pending') $$,
  'the order pays installment 1 of 2'
);
insert into public.cart_programs (application_id) values ((select value::uuid from made where name = 'a'));
select is(
  (select q -> 'programs' -> 0 -> 'positions' from public.checkout_quote() q),
  '[2]'::jsonb, 'an installment waiting in an order isn''t paid twice: the next one is'
);
delete from public.cart_programs;

select pg_temp.reset_role();
select public.complete_order_payment((select value::uuid from made where name = 'a1'));
select results_eq(
  $$ select a.status, p.paid_at is not null
     from public.program_applications a join public.program_payments p on p.application_id = a.id
     where a.id = (select value::uuid from made where name = 'a') and p.position = 1 $$,
  $$ values ('confirmed', true) $$,
  'paying the first installment confirms the place'
);

-- The minor pays without asking the guardian again.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c2');
insert into public.cart_programs (application_id, pay_in_full) values ((select value::uuid from made where name = 't'), true);
insert into made select 't1', (public.create_order('{}')).id;
select results_eq(
  $$ select o.guardian_status, o.total, i.name_en from public.orders o join public.order_items i on i.order_id = o.id
     where o.id = (select value::uuid from made where name = 't1') $$,
  $$ values ('approved', 1000000::bigint, 'Summer Program · installments 1–2 of 2') $$,
  'a minor''s installments were approved with the application'
);
select pg_temp.reset_role();
select public.complete_order_payment((select value::uuid from made where name = 't1'));

-- ── Refunds ─────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c1');
select is(
  public.withdraw_program_application((select value::uuid from made where name = 'a')),
  500000::bigint, 'withdrawing 60 days before refunds what was paid in full'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c4', 'aal2');
select is(
  public.end_program_application((select value::uuid from made where name = 't'), 'visa_refused'),
  800000::bigint, 'a refused visa refunds the program''s visa share'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2c5', 'aal2');
select public.mark_program_refunded((select value::uuid from made where name = 't'), 'WAYL-123');
select results_eq(
  $$ select status, cancel_reason, refund_amount, refunded_at is not null, refund_reference
     from public.program_applications where id = (select value::uuid from made where name = 't') $$,
  $$ values ('cancelled', 'visa_refused', 800000::bigint, true, 'WAYL-123') $$,
  'finance records the refund'
);

-- ── Passport scans are deleted after ────────────────────────────────────────

select pg_temp.reset_role();
update public.program_applications set ended_at = now() - interval '31 days'
where id = (select value::uuid from made where name = 'a');
select results_eq(
  $$ select application_id, files from public.sweep_program_documents() $$,
  $$ values ((select value::uuid from made where name = 'a'),
       '{00000000-0000-0000-0000-00000000a2c1/9a6a0000-0000-0000-0000-0000000000b1/passport.jpg}'::text[]) $$,
  '30 days after an application ends its scans are returned to delete'
);
select is(
  (select passport_files from public.program_applications where id = (select value::uuid from made where name = 'a')),
  '{}'::text[], 'and forgotten'
);

select * from finish();
rollback;
