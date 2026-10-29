-- The IDEA's paid programs: refund terms fixed when a place is accepted,
-- and releasing a place with any installment overdue.
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

-- A is an adult applicant, E an editor.
delete from public.staff;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a2d1', 'a9zzu@example.iq', '{"full_name":"Aya"}'),
  ('00000000-0000-0000-0000-00000000a2d2', 'b9zzu@example.iq', '{"full_name":"Bilal"}'),
  ('00000000-0000-0000-0000-00000000a2d4', 'e9zzu@example.iq', '{}');
update public.profiles set birthday = date '1995-05-05'
where id in ('00000000-0000-0000-0000-00000000a2d1', '00000000-0000-0000-0000-00000000a2d2');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-00000000a2d4', 'editor');

insert into public.opportunities (id, organization_id, kind, title_ar, title_en, location, status, starts_on) values
  ('9a7a0000-0000-0000-0000-0000000000b1', null, 'program', 'برنامج', 'Terms Program', 'Boston', 'approved', current_date + 60);
insert into public.programs (opportunity_id, price, min_age, passport_required, installments, refund_schedule, visa_refund_rate)
values (
  '9a7a0000-0000-0000-0000-0000000000b1', 1000000, 18, false,
  jsonb_build_array(
    jsonb_build_object('percent', 50),
    jsonb_build_object('percent', 50, 'due_on', current_date + 30)
  ),
  '[{"days_before": 30, "percent": 100}]', 90
);

create temporary table made (name text primary key, value text);
grant all on made to anon, authenticated;

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2d1');
insert into made select 'a', public.apply_to_program('9a7a0000-0000-0000-0000-0000000000b1', 'Mum', '+9647700000201');
select pg_temp.login_as('00000000-0000-0000-0000-00000000a2d2');
insert into made select 'b', public.apply_to_program('9a7a0000-0000-0000-0000-0000000000b1', 'Dad', '+9647700000202');

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2d4', 'aal2');
select public.review_program_application((select value::uuid from made where name = 'a'), 'accepted');
select public.review_program_application((select value::uuid from made where name = 'b'), 'accepted');
select results_eq(
  $$ select refund_schedule, visa_refund_rate from public.program_applications
     where id = (select value::uuid from made where name = 'a') $$,
  $$ values ('[{"days_before": 30, "percent": 100}]'::jsonb, 90::smallint) $$,
  'accepting fixes the refund terms on the application'
);

-- The program's terms change afterwards.
update public.programs set refund_schedule = '[]', visa_refund_rate = 0;

-- Both pay their first installment.
select pg_temp.reset_role();
update public.program_payments set paid_at = now() where position = 1;
update public.program_applications set status = 'confirmed';

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2d1');
select is(
  public.withdraw_program_application((select value::uuid from made where name = 'a')),
  500000::bigint, 'withdrawing refunds by the terms accepted, not the program''s new ones'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2d4', 'aal2');
select throws_ok(
  $$ select public.end_program_application((select value::uuid from made where name = 'b'), 'unpaid') $$,
  '23514', 'Not overdue',
  'a place is released only once an installment is past its date'
);
select pg_temp.reset_role();
update public.program_payments set due_on = current_date - 1
where application_id = (select value::uuid from made where name = 'b') and position = 2;

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2d4', 'aal2');
select is(
  public.end_program_application((select value::uuid from made where name = 'b'), 'unpaid'),
  500000::bigint, 'a confirmed place with a later installment overdue can be released, refunded by its terms'
);
select results_eq(
  $$ select status, cancel_reason from public.program_applications
     where id = (select value::uuid from made where name = 'b') $$,
  $$ values ('cancelled', 'unpaid') $$,
  'and it is cancelled as unpaid'
);

-- A refused visa uses the share accepted.
select pg_temp.reset_role();
update public.program_applications set status = 'confirmed', cancel_reason = null, ended_at = null, refund_amount = null
where id = (select value::uuid from made where name = 'b');
select pg_temp.login_as('00000000-0000-0000-0000-00000000a2d4', 'aal2');
select is(
  public.end_program_application((select value::uuid from made where name = 'b'), 'visa_refused'),
  450000::bigint, 'a refused visa refunds the share accepted'
);

-- Trusted server code (the service role) writes programs too.
select pg_temp.reset_role();
insert into public.opportunities (id, organization_id, kind, title_ar, title_en, location, status) values
  ('9a7a0000-0000-0000-0000-0000000000b2', null, 'program', 'برنامج آخر', 'Server Program', 'Erbil', 'approved');
set local role service_role;
select lives_ok(
  $$ insert into public.programs (opportunity_id, price, installments, refund_schedule)
     values ('9a7a0000-0000-0000-0000-0000000000b2', 500000, '[{"percent": 100}]', '[]') $$,
  'the service role can write a program (its checks run as the writer)'
);
reset role;

select * from finish();
rollback;
