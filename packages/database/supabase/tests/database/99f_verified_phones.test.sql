-- Verified phones: owners read and remove theirs, only the API adds them,
-- and deliveries need one once the store turns the check on.
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

select plan(15);

insert into auth.users (id, email, phone, phone_confirmed_at) values
  ('00000000-0000-0000-0000-0000000009f1', 'p9f1@example.iq', null, null),
  ('00000000-0000-0000-0000-0000000009f2', 'p9f2@example.iq', '9647700009002', now());

insert into public.verified_phones (user_id, phone) values
  ('00000000-0000-0000-0000-0000000009f1', '+9647700009001');

insert into public.plus_areas (id, name_ar, name_en, weekday)
values ('99f00000-0000-0000-0000-0000000000a1', 'الكرادة', 'Karrada 9f', 4);

-- Reading and removing.
select pg_temp.login_as('00000000-0000-0000-0000-0000000009f1');
select results_eq(
  'select phone from public.verified_phones',
  array['+9647700009001'],
  'Owners read their verified phones'
);
select throws_ok(
  $$insert into public.verified_phones (user_id, phone)
    values ('00000000-0000-0000-0000-0000000009f1', '+9647700009999')$$,
  '42501', null,
  'Only the API adds verified phones'
);
select ok(public.is_phone_verified('+9647700009001'), 'A verified phone is verified');
select ok(not public.is_phone_verified('+9647700009999'), 'Another phone is not');

select pg_temp.login_as('00000000-0000-0000-0000-0000000009f2');
select is_empty('select 1 from public.verified_phones', 'Others'' phones stay hidden');
select ok(
  public.is_phone_verified('+9647700009002'),
  'The phone a Pass signed in with by SMS counts as verified'
);

-- The check is off by default.
select pg_temp.login_as('00000000-0000-0000-0000-0000000009f1');
select lives_ok(
  $$select public.set_plus_home('99f00000-0000-0000-0000-0000000000a1', 'Street 1', '+9647700009999')$$,
  'Without the setting, any phone is accepted'
);

update public.store_settings set require_verified_phone = true;
select ok(
  not (select require_verified_phone from public.store_settings),
  'Customers can''t turn the check on'
);

select pg_temp.reset_role();
update public.store_settings set require_verified_phone = true;
delete from public.plus_homes where user_id = '00000000-0000-0000-0000-0000000009f1';

-- With it on, the caller's own deliveries need a verified phone. (As the
-- superuser with the caller's claims, so RLS on orders doesn't interfere.)
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000009f1","role":"authenticated"}',
  true
);
select throws_ok(
  $$insert into public.orders (user_id, subtotal, shipping_fee, total, shipping_address)
    values ('00000000-0000-0000-0000-0000000009f1', 1000, 0, 1000, '{"phone":"+9647700009999"}')$$,
  '23514', 'Verify your phone number first',
  'A delivery to an unverified phone is refused'
);
select lives_ok(
  $$insert into public.orders (user_id, subtotal, shipping_fee, total, shipping_address)
    values ('00000000-0000-0000-0000-0000000009f1', 1000, 0, 1000, '{"phone":"+9647700009001"}')$$,
  'A delivery to a verified phone goes through'
);
select lives_ok(
  $$insert into public.orders (user_id, subtotal, shipping_fee, total, shipping_address, fulfilment)
    values ('00000000-0000-0000-0000-0000000009f1', 1000, 0, 1000, '{}', 'pickup')$$,
  'An order with nothing to deliver needs no phone'
);
select throws_ok(
  $$select public.set_plus_home('99f00000-0000-0000-0000-0000000000a1', 'Street 1', '+9647700009999')$$,
  '23514', 'Verify your phone number first',
  'A Plus home needs a verified phone'
);
select lives_ok(
  $$select public.set_plus_home('99f00000-0000-0000-0000-0000000000a1', 'Street 1', '+9647700009001')$$,
  'A Plus home with a verified phone is saved'
);

-- Orders made by staff or jobs for someone else aren't checked here.
select pg_temp.reset_role();
select lives_ok(
  $$insert into public.orders (user_id, subtotal, shipping_fee, total, shipping_address)
    values ('00000000-0000-0000-0000-0000000009f2', 1000, 0, 1000, '{"phone":"+9647700009999"}')$$,
  'Orders the system makes are not checked'
);

-- Removing a verified phone.
select pg_temp.login_as('00000000-0000-0000-0000-0000000009f1');
delete from public.verified_phones where phone = '+9647700009001';
select ok(
  not public.is_phone_verified('+9647700009001'),
  'Owners remove their verified phones'
);

select * from finish();
rollback;
