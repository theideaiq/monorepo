-- Get offers from shops: a member's request with photos, what shops see
-- (no identity), one offer per shop, messages, accepting one, finishing the
-- sale, closing and expiry.
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
select plan(30);

-- M asks for offers; K is 16; O owns Shop One (W works there); T owns Shop Two.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a7c1', 'm9zzy@example.iq', '{"full_name":"Mina Saleh"}'),
  ('00000000-0000-0000-0000-00000000a7c2', 'k9zzy@example.iq', '{"full_name":"Kid"}'),
  ('00000000-0000-0000-0000-00000000a7c3', 'o9zzy@example.iq', '{"full_name":"Omar"}'),
  ('00000000-0000-0000-0000-00000000a7c4', 'w9zzy@example.iq', '{"full_name":"Wafa"}'),
  ('00000000-0000-0000-0000-00000000a7c5', 't9zzy@example.iq', '{"full_name":"Tariq"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
update public.profiles set birthday = (current_date - interval '16 years')::date
where id = '00000000-0000-0000-0000-00000000a7c2';
update public.profiles set full_name = 'Mina Saleh' where id = '00000000-0000-0000-0000-00000000a7c1';
insert into public.organizations (id, name, slug, created_by) values
  ('9a7c0000-0000-0000-0000-0000000000c1', 'Shop One', 'one-9zzy', '00000000-0000-0000-0000-00000000a7c3'),
  ('9a7c0000-0000-0000-0000-0000000000c2', 'Shop Two', 'two-9zzy', '00000000-0000-0000-0000-00000000a7c5');
insert into public.organization_members (organization_id, user_id, role) values
  ('9a7c0000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000a7c3', 'owner'),
  ('9a7c0000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000a7c4', 'member'),
  ('9a7c0000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000a7c5', 'owner');
insert into public.sellers (id, organization_id, name, status) values
  ('9a7c0000-0000-0000-0000-0000000000d1', '9a7c0000-0000-0000-0000-0000000000c1', 'Shop One', 'approved'),
  ('9a7c0000-0000-0000-0000-0000000000d2', '9a7c0000-0000-0000-0000-0000000000c2', 'Shop Two', 'approved');
update public.delivery_zones set active = true where governorate = 'baghdad';
insert into storage.objects (bucket_id, name)
select 'sell-request-photos', u || '/' || n || '.jpg'
from unnest(array['00000000-0000-0000-0000-00000000a7c1', '00000000-0000-0000-0000-00000000a7c2', '00000000-0000-0000-0000-00000000a7c3']) u,
  generate_series(1, 3) n;

create temporary table made (name text primary key, id uuid);
grant all on made to anon, authenticated;

-- ── Asking ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c2');
select throws_ok(
  $$ select public.create_sell_request('Old console', 'used', 'Works, a few scratches on top',
     array['00000000-0000-0000-0000-00000000a7c2/1.jpg', '00000000-0000-0000-0000-00000000a7c2/2.jpg', '00000000-0000-0000-0000-00000000a7c2/3.jpg'],
     'baghdad') $$,
  '23514', 'You need to be 18 or over to sell', 'sellers are adults'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c1');
select throws_ok(
  $$ select public.create_sell_request('Vinyl collection', 'used', 'Forty records, sleeves in good shape',
     array['00000000-0000-0000-0000-00000000a7c1/1.jpg', '00000000-0000-0000-0000-00000000a7c1/2.jpg'],
     'baghdad') $$,
  '23514', 'Add 3 to 8 photos of the item', 'at least 3 photos'
);
select throws_ok(
  $$ select public.create_sell_request('Vinyl collection', 'used', 'Forty records, sleeves in good shape',
     array['00000000-0000-0000-0000-00000000a7c1/1.jpg', '00000000-0000-0000-0000-00000000a7c1/2.jpg', '00000000-0000-0000-0000-00000000a7c3/1.jpg'],
     'baghdad') $$,
  '23514', 'Add 3 to 8 photos of the item', 'the member''s own photos'
);
select throws_ok(
  $$ select public.create_sell_request('Vinyl collection', 'used', 'Forty records, sleeves in good shape',
     array['00000000-0000-0000-0000-00000000a7c1/1.jpg', '00000000-0000-0000-0000-00000000a7c1/2.jpg', '00000000-0000-0000-0000-00000000a7c1/3.jpg'],
     'atlantis') $$,
  '23514', 'Choose the area the item is in', 'an area The IDEA delivers to'
);
insert into made select 'request', (public.create_sell_request(
  'Vinyl collection', 'used', 'Forty records, sleeves in good shape',
  array['00000000-0000-0000-0000-00000000a7c1/1.jpg', '00000000-0000-0000-0000-00000000a7c1/2.jpg', '00000000-0000-0000-0000-00000000a7c1/3.jpg'],
  'Baghdad'
)).id;
select results_eq(
  $$ select status::text, governorate, expires_at from public.sell_requests where id = (select id from made where name = 'request') $$,
  $$ values ('open', 'baghdad', now() + interval '7 days') $$,
  'a request is open for 7 days'
);

-- O asks too, for the own-item check.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c3');
insert into made select 'own', (public.create_sell_request(
  'Spare turntable', 'used', 'A working turntable from the shop owner',
  array['00000000-0000-0000-0000-00000000a7c3/1.jpg', '00000000-0000-0000-0000-00000000a7c3/2.jpg', '00000000-0000-0000-0000-00000000a7c3/3.jpg'],
  'baghdad'
)).id;

-- ── What shops see ──
select is(
  (select count(*)::integer from public.sell_requests where user_id <> '00000000-0000-0000-0000-00000000a7c3'),
  0, 'shops never read requests directly'
);
select results_eq(
  $$ select id, first_name from public.open_sell_requests('9a7c0000-0000-0000-0000-0000000000d1') $$,
  $$ values ((select id from made where name = 'request'), 'Mina') $$,
  'a shop sees open requests with the first name only, never its own people''s'
);
select ok(
  private.can_see_sell_photo('00000000-0000-0000-0000-00000000a7c1/1.jpg'),
  'shops see the photos of open requests'
);
select throws_ok(
  $$ select public.make_sell_offer((select id from made where name = 'own'), '9a7c0000-0000-0000-0000-0000000000d1', 100000, 'collect', 'cash') $$,
  '23514', 'You can''t make an offer on your own item', 'no offers on the shop''s own people''s items'
);

-- ── Offers ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c4');
select throws_ok(
  $$ select public.make_sell_offer((select id from made where name = 'request'), '9a7c0000-0000-0000-0000-0000000000d1', 100000, 'collect', 'cash') $$,
  '42501', 'Not allowed', 'only owners and admins make offers'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c3');
insert into made select 'offer one', (public.make_sell_offer(
  (select id from made where name = 'request'), '9a7c0000-0000-0000-0000-0000000000d1', 150000, 'collect', 'cash', 'We pick up in Karrada'
)).id;
select results_eq(
  $$ select status::text, expires_at from public.sell_offers where id = (select id from made where name = 'offer one') $$,
  $$ values ('sent', now() + interval '72 hours') $$,
  'an offer stands for 72 hours'
);
select throws_ok(
  $$ select public.make_sell_offer((select id from made where name = 'request'), '9a7c0000-0000-0000-0000-0000000000d1', 160000, 'collect', 'cash') $$,
  '23505', 'Your shop already has an offer on this', 'one offer per shop'
);
select is(
  (select offer_amount from public.open_sell_requests('9a7c0000-0000-0000-0000-0000000000d1')
   where id = (select id from made where name = 'request')),
  150000::bigint, 'the shop sees its own offer on the request'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c5');
insert into made select 'offer two', (public.make_sell_offer(
  (select id from made where name = 'request'), '9a7c0000-0000-0000-0000-0000000000d2', 120000, 'drop_off', 'transfer'
)).id;
select is(
  (select count(*)::integer from public.sell_offers), 1, 'a shop sees only its own offers'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c1');
select is(
  (select count(*)::integer from public.sell_offers where request_id = (select id from made where name = 'request')),
  2, 'the member sees every offer on their request'
);
select is(
  (select count(*)::integer from public.notifications where event = 'sell_offer_received'),
  2, 'and hears about each'
);

-- ── Messages ──
select lives_ok(
  $$ select public.send_sell_message((select id from made where name = 'offer one'), 'Can you come on Saturday?') $$,
  'the member writes to a shop about its offer'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c4');
select results_eq(
  $$ select from_shop, body from public.sell_messages $$,
  $$ values (false, 'Can you come on Saturday?') $$,
  'people at the shop read it'
);
select throws_ok(
  $$ select author_id from public.sell_messages $$,
  '42501', null, 'who wrote it stays private'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c5');
select is(
  (select count(*)::integer from public.sell_messages), 0, 'other shops don''t see it'
);

-- ── Accepting and finishing ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c1');
select is(
  (public.answer_sell_offer((select id from made where name = 'offer one'), true)).status::text,
  'accepted', 'the member accepts one offer'
);
select results_eq(
  $$ select (select status::text from public.sell_offers where id = (select id from made where name = 'offer two')),
            (select status::text from public.sell_requests where id = (select id from made where name = 'request')) $$,
  $$ values ('declined', 'accepted') $$,
  'the others are declined and the request is taken'
);
select throws_ok(
  $$ select public.answer_sell_offer((select id from made where name = 'offer two'), true) $$,
  '23514', 'This offer can''t be answered now', 'one offer is accepted'
);
select throws_ok(
  $$ select public.finish_sell_offer((select id from made where name = 'offer one'), true) $$,
  '23514', 'The shop marks the sale done', 'the shop marks it done'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c3');
select is(
  (public.finish_sell_offer((select id from made where name = 'offer one'), true)).status::text,
  'completed', 'the shop marks the sale done'
);
select pg_temp.reset_role();
select results_eq(
  $$ select r.status::text,
       (select count(*)::integer from public.notifications n
        where n.user_id = '00000000-0000-0000-0000-00000000a7c1' and n.event = 'sell_offer_completed')
     from public.sell_requests r where r.id = (select id from made where name = 'request') $$,
  $$ values ('completed', 1) $$,
  'the request is done and the member hears'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c5');
select ok(
  not private.can_see_sell_photo('00000000-0000-0000-0000-00000000a7c4/none.jpg')
    and not exists (
      select 1 from public.sell_requests r
      where r.id = (select id from made where name = 'request')
    ),
  'a shop whose offer was declined no longer reads the request'
);

-- ── Closing and expiry ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c1');
insert into made select 'second', (public.create_sell_request(
  'Board games', 'used', 'Three board games, complete',
  array['00000000-0000-0000-0000-00000000a7c1/1.jpg', '00000000-0000-0000-0000-00000000a7c1/2.jpg', '00000000-0000-0000-0000-00000000a7c1/3.jpg'],
  'baghdad'
)).id;
select is(
  (public.close_sell_request((select id from made where name = 'second'))).status::text,
  'closed', 'the member closes a request without choosing'
);
insert into made select 'third', (public.create_sell_request(
  'Comics', 'used', 'A box of comics, good condition',
  array['00000000-0000-0000-0000-00000000a7c1/1.jpg', '00000000-0000-0000-0000-00000000a7c1/2.jpg', '00000000-0000-0000-0000-00000000a7c1/3.jpg'],
  'baghdad'
)).id;
select pg_temp.login_as('00000000-0000-0000-0000-00000000a7c5');
select public.make_sell_offer((select id from made where name = 'third'), '9a7c0000-0000-0000-0000-0000000000d2', 50000, 'collect', 'cash');
select pg_temp.reset_role();
update public.sell_requests set expires_at = now() - interval '1 second' where id = (select id from made where name = 'third');
update public.sell_offers set expires_at = now() - interval '1 second' where request_id = (select id from made where name = 'third');
select is(public.sweep_sell_requests(), 1, 'the sweep expires what''s due');
select results_eq(
  $$ select r.status::text, o.status::text from public.sell_requests r
     join public.sell_offers o on o.request_id = r.id where r.id = (select id from made where name = 'third') $$,
  $$ values ('expired', 'expired') $$,
  'with its offers'
);

select * from finish();
rollback;
