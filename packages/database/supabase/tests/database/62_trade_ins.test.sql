-- Sell to us (trade-ins) and their photos. Run with `bun run db:test`.
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

select plan(31);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- U and V are customers, S is support, E is an editor. T1 is U's request.

delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'trade-u@example.iq', '{"full_name":"Customer Uday"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'trade-v@example.iq', '{"full_name":"Customer Vian"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'trade-s@example.iq', '{"full_name":"Support Sara"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'trade-e@example.iq', '{"full_name":"Editor Elias"}');
-- Fixture members are adults (ages: a date of birth is needed to buy).
update public.profiles set birthday = date '1990-01-01' where birthday is null;

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000d3', 'support'),
  ('00000000-0000-0000-0000-0000000000d4', 'editor');

insert into public.trade_ins (id, user_id, category, title, description, condition, payout, photos, contact_phone)
values (
  '62000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000d1',
  'vinyl', 'Kind of Blue (1959 pressing)', 'Original sleeve, light wear.', 'like_new', 'store_credit',
  array['00000000-0000-0000-0000-0000000000d1/sleeve.jpg'], '+9647701234567'
);

-- ── Visitors ────────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select throws_ok(
  $$ select * from public.trade_ins $$,
  '42501', null, 'visitors cannot read trade-ins'
);

-- ── Customers send requests ─────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select lives_ok(
  $$ insert into public.trade_ins (category, title, condition, contact_phone, photos)
     values ('game', 'Chrono Trigger (SNES)', 'good', '+9647801234567',
       array['00000000-0000-0000-0000-0000000000d1/cart.jpg']) $$,
  'customers send a request with photos in their folder'
);
select throws_ok(
  $$ insert into public.trade_ins (category, title, condition, contact_phone, photos)
     values ('book', 'Borrowed photos', 'fair', '+9647801234567',
       array['00000000-0000-0000-0000-0000000000d2/not-mine.jpg']) $$,
  '23514', null, 'photos must be in the customer''s own folder'
);
select throws_ok(
  $$ insert into public.trade_ins (category, title, condition, contact_phone)
     values ('book', 'No phone', 'fair', '07701234567') $$,
  '23514', null, 'the contact number is an Iraqi mobile in E.164'
);
select throws_ok(
  $$ insert into public.trade_ins (category, title, condition, contact_phone, status)
     values ('book', 'Pre-accepted', 'fair', '+9647701234567', 'accepted') $$,
  '42501', null, 'customers cannot choose the status'
);
select throws_ok(
  $$ insert into public.trade_ins (user_id, category, title, condition, contact_phone)
     values ('00000000-0000-0000-0000-0000000000d2', 'book', 'For someone else', 'fair', '+9647701234567') $$,
  '42501', null, 'customers cannot send a request for someone else'
);
select is((select count(*)::int from public.trade_ins), 2, 'customers see their requests');
select is_empty(
  $$ update public.trade_ins set status = 'accepted' returning id $$,
  'customers cannot change a request directly'
);
select throws_ok(
  $$ select public.respond_to_trade_in_offer('62000000-0000-0000-0000-000000000001', true) $$,
  'P0002', null, 'there is nothing to accept before an offer'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d2');
select is((select count(*)::int from public.trade_ins), 0, 'requests are private');

-- ── Staff review ────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3', 'aal1');
select is((select count(*)::int from public.trade_ins), 0, 'staff rights need an authenticator-app session');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d4', 'aal2');
select is((select count(*)::int from public.trade_ins), 0, 'editors do not see trade-ins');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3', 'aal2');
select is((select count(*)::int from public.trade_ins), 2, 'support sees every request');
select throws_ok(
  $$ update public.trade_ins set status = 'offer_made' where id = '62000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'an offer needs an amount'
);
select lives_ok(
  $$ update public.trade_ins set status = 'offer_made', offer_amount = 25000, offer_note = 'Store credit, collected in Karrada.'
     where id = '62000000-0000-0000-0000-000000000001' $$,
  'support makes an offer'
);
select throws_ok(
  $$ update public.trade_ins set status = 'accepted' where id = '62000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'only the customer accepts an offer'
);

select pg_temp.reset_role();
select is(
  (select count(*)::int from public.notifications
   where user_id = '00000000-0000-0000-0000-0000000000d1' and kind = 'trade_in' and event = 'trade_in_offer'
     and (data ->> 'amount')::bigint = 25000),
  1, 'the customer is notified of the offer'
);
select ok(
  (select offered_at is not null and reviewed_by = '00000000-0000-0000-0000-0000000000d3'
   from public.trade_ins where id = '62000000-0000-0000-0000-000000000001'),
  'the offer records when and who'
);

-- ── The customer answers ────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select is(
  public.respond_to_trade_in_offer('62000000-0000-0000-0000-000000000001', true),
  'accepted'::public.trade_in_status,
  'the customer accepts the offer'
);
select throws_ok(
  $$ select public.complete_trade_in('62000000-0000-0000-0000-000000000001', true) $$,
  '42501', null, 'customers cannot complete a trade'
);
select lives_ok(
  $$ select public.withdraw_trade_in((select id from public.trade_ins where status = 'submitted')) $$,
  'customers withdraw an open request'
);
select throws_ok(
  $$ select public.withdraw_trade_in('62000000-0000-0000-0000-000000000001') $$,
  'P0002', null, 'an accepted trade cannot be withdrawn'
);

-- ── Completion ──────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3', 'aal2');
select isnt(
  public.complete_trade_in('62000000-0000-0000-0000-000000000001', true),
  null,
  'support completes the trade with a draft product'
);

select pg_temp.reset_role();
select results_eq(
  $$ select p.status::text, p.condition::text, p.name_en, p.stock_count
     from public.trade_ins t join public.products p on p.id = t.product_id
     where t.id = '62000000-0000-0000-0000-000000000001' $$,
  $$ values ('draft', 'open_box', 'Kind of Blue (1959 pressing)', 1) $$,
  'the draft product is prefilled from the request'
);
select ok(
  (select status = 'completed' and responded_at is not null and closed_at is not null
   from public.trade_ins where id = '62000000-0000-0000-0000-000000000001'),
  'the completed trade keeps its dates'
);
select is(
  (select count(*)::int from public.notifications
   where user_id = '00000000-0000-0000-0000-0000000000d1' and event = 'trade_in_completed'),
  1, 'the customer is told the trade is complete'
);

-- Suspended customers cannot send requests.
update public.profiles set banned_at = now() where id = '00000000-0000-0000-0000-0000000000d2';
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d2');
select throws_ok(
  $$ insert into public.trade_ins (category, title, condition, contact_phone)
     values ('other', 'Anything', 'poor', '+9647701234567') $$,
  '42501', null, 'suspended customers cannot send requests'
);

-- ── Photos ──────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('trade-ins', '00000000-0000-0000-0000-0000000000d1/sleeve.jpg') $$,
  'customers upload photos to their folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name)
     values ('trade-ins', '00000000-0000-0000-0000-0000000000d2/sleeve.jpg') $$,
  '42501', null, 'customers cannot upload to someone else''s folder'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d2');
select is_empty(
  $$ select 1 from storage.objects where bucket_id = 'trade-ins' $$,
  'other customers cannot see the photos'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3', 'aal2');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'trade-ins'),
  1, 'support sees the photos'
);

select * from finish();
rollback;
