-- Plus Duo: the plans, inviting and joining (own Plus, ages, guardians),
-- what the partner gets, shared slots and swaps with both queues, leaving,
-- removal at the renewal and the cron.
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
select plan(51);

-- H holds Shine Duo; P joins it; O has Glow of their own; X is anyone;
-- K holds Glow Duo, T (15) joins it with G as guardian.
truncate public.rentals, public.plus_swaps, public.plus_homes, public.rental_queue_items cascade;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000d10d1', 'h-duo@example.iq', '{"full_name":"Huda Ali"}'),
  ('00000000-0000-0000-0000-0000000d10d2', 'p-duo@example.iq', '{"full_name":"Peri Ali"}'),
  ('00000000-0000-0000-0000-0000000d10d3', 't-duo@example.iq', '{"full_name":"Taim"}'),
  ('00000000-0000-0000-0000-0000000d10d4', 'g-duo@example.iq', '{"full_name":"Ghada"}'),
  ('00000000-0000-0000-0000-0000000d10d5', 'o-duo@example.iq', '{"full_name":"Omar"}'),
  ('00000000-0000-0000-0000-0000000d10d6', 'x-duo@example.iq', '{"full_name":"Xena"}'),
  ('00000000-0000-0000-0000-0000000d10d7', 'k-duo@example.iq', '{"full_name":"Karim"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
update public.profiles set full_name = u.raw_user_meta_data ->> 'full_name'
from auth.users u where u.id = profiles.id and u.email like '%-duo@example.iq';
update public.profiles set birthday = (current_date - interval '15 years')::date
where id = '00000000-0000-0000-0000-0000000d10d3';

insert into public.subscriptions (id, user_id, plan_id, status, provider, current_period_start, current_period_end)
values
  ('d10d0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000d10d1', 'plus-shine-duo', 'active', 'wayl', now(), now() + interval '30 days'),
  ('d10d0000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000d10d5', 'plus-glow', 'active', 'wayl', now(), now() + interval '30 days'),
  ('d10d0000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000d10d7', 'plus-glow-duo', 'active', 'wayl', now(), now() + interval '30 days');

insert into public.plus_areas (id, name_ar, name_en, weekday)
values ('d10d0000-0000-0000-0000-0000000000b1', 'المنصور', 'Mansour duo', 4);
insert into public.plus_homes (user_id, area_id, address, phone)
values ('00000000-0000-0000-0000-0000000d10d1', 'd10d0000-0000-0000-0000-0000000000b1', 'Street 14, Mansour', '+9647700000141');
insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id) values
  ('d10d0000-0000-0000-0000-000000000001', 'duo-game-1', 'لعبة 1', 'Duo game 1', 59750, 2, 'active', 'rental',
   '50000000-0000-0000-0000-000000000001'),
  ('d10d0000-0000-0000-0000-000000000002', 'duo-game-2', 'لعبة 2', 'Duo game 2', 59750, 2, 'active', 'rental',
   '50000000-0000-0000-0000-000000000001'),
  ('d10d0000-0000-0000-0000-000000000003', 'duo-game-3', 'لعبة 3', 'Duo game 3', 59750, 2, 'active', 'rental',
   '50000000-0000-0000-0000-000000000001');

create temporary table made (name text primary key, token text, id uuid);
grant all on made to authenticated;

-- ── Plans ──
select results_eq(
  $$ select id, amount, billing_interval::text, tier::integer, rental_slots, home_swaps
     from public.plans where duo and student_of is null order by position $$,
  $$ values
    ('plus-glow-duo', 20750::bigint, 'month', 1, 1, 1),
    ('plus-shine-duo', 31750::bigint, 'month', 2, 2, 2),
    ('plus-blaze-duo', 55750::bigint, 'month', 3, 4, 4),
    ('plus-glow-duo-year', 207500::bigint, 'year', 1, 1, 1),
    ('plus-shine-duo-year', 317500::bigint, 'year', 2, 2, 2),
    ('plus-blaze-duo-year', 557500::bigint, 'year', 3, 4, 4) $$,
  'Duo plans: 20,750 · 31,750 · 55,750 a month and 10 months for 12'
);
select results_eq(
  $$ select id, amount from public.plans where duo and student_of is not null order by position $$,
  $$ values ('plus-glow-duo-student', 15750::bigint), ('plus-shine-duo-student', 24750::bigint),
     ('plus-blaze-duo-student', 43750::bigint) $$,
  'student holders pay 20% less'
);

-- ── Inviting ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d5');
select throws_ok($$ select public.invite_duo_partner() $$, '42501', 'Not a Duo plan', 'only a Duo invites');

select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d1');
insert into made select 'p', (i).invite_token, (i).id from (select public.invite_duo_partner() i) x;
select ok(
  (select length(token) >= 20 and (select invite_expires_at from public.plus_members where id = made.id) > now() + interval '6 days'
   from made where name = 'p'),
  'the holder gets an invite code, open for 7 days'
);
select results_eq(
  $$ select role, user_id from public.plus_members order by role $$,
  $$ values ('holder', '00000000-0000-0000-0000-0000000d10d1'::uuid), ('partner', null::uuid) $$,
  'with a holder row and an open partner place'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d2');
select results_eq(
  $$ select holder_name, plan_id, tier, open from public.duo_invite((select token from made where name = 'p')) $$,
  $$ values ('Huda', 'plus-shine-duo', 2, true) $$,
  'the invite shows who sent it and the plan'
);
select is_empty($$ select * from public.plus_members $$, 'before joining, the invitee sees no rows');
select is(
  (select public.my_duo()), null::jsonb, 'and has no Duo'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d1');
select throws_ok(
  $$ select public.accept_duo_invite((select token from made where name = 'p')) $$,
  '23514', 'Send the invite to the second person', 'the holder can''t join their own Duo'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d5');
select throws_ok(
  $$ select public.accept_duo_invite((select token from made where name = 'p')) $$,
  '23514', 'You already have Plus', 'someone with Plus of their own can''t join'
);
select throws_ok(
  $$ select public.accept_duo_invite('not-a-code') $$,
  'P0002', 'This invite has expired', 'a wrong code'
);

-- ── Joining ──
select pg_temp.reset_role();
select is(private.plus_tier('00000000-0000-0000-0000-0000000d10d2'), 0, 'P has no Plus yet');
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d2');
select lives_ok(
  $$ select public.accept_duo_invite((select token from made where name = 'p')) $$,
  'P accepts'
);
select results_eq(
  $$ select public.my_duo() ->> 'role', public.my_duo() ->> 'holder_name', public.my_duo() ->> 'partner_status' $$,
  $$ values ('partner', 'Huda', 'joined') $$,
  'P is the partner on Huda''s Duo'
);
select is((select count(*)::integer from public.plus_members), 2, 'P sees both rows of the Duo');

select pg_temp.reset_role();
select is(private.plus_tier('00000000-0000-0000-0000-0000000d10d2'), 2, 'the partner has the plan''s tier on their own');
select is((private.member_plan('00000000-0000-0000-0000-0000000d10d2')).id, 'plus-shine-duo', 'and its plan (Bulbs rate, perks)');
select is(
  (select count(*)::integer from public.subscriptions where user_id = '00000000-0000-0000-0000-0000000d10d2'),
  0, 'without a subscription of their own'
);
select is(private.plus_member_count(), 3, 'the partner doesn''t take a Plus place');

select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d6');
select is_empty($$ select * from public.plus_members $$, 'others see nothing');
select throws_ok(
  $$ select public.accept_duo_invite((select token from made where name = 'p')) $$,
  'P0002', 'This invite has expired', 'an accepted code can''t be used again'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d1');
select throws_ok($$ select public.invite_duo_partner() $$, '23514', 'Your Duo already has a second person',
  'one second person per Duo');

-- ── A teen with their guardian ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d7');
insert into made select 't', (i).invite_token, (i).id from (select public.invite_duo_partner() i) x;
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d3');
select throws_ok(
  $$ select public.accept_duo_invite((select token from made where name = 't')) $$,
  '23514', 'Link your guardian''s Pass first', 'a 15-year-old needs a guardian'
);
select pg_temp.reset_role();
insert into public.guardian_links (teen_id, guardian_id, status)
values ('00000000-0000-0000-0000-0000000d10d3', '00000000-0000-0000-0000-0000000d10d4', 'active');
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d3');
select is(
  (public.accept_duo_invite((select token from made where name = 't'))).guardian_status,
  'pending', 'joining waits for the guardian'
);
select pg_temp.reset_role();
select is(private.plus_tier('00000000-0000-0000-0000-0000000d10d3'), 0, 'no Plus until they approve');
select is(
  (select count(*)::integer from public.notifications
   where user_id = '00000000-0000-0000-0000-0000000d10d4' and event = 'plus_duo_guardian'),
  1, 'the guardian is asked'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d1');
select throws_ok(
  $$ select public.decide_duo_guardian((select id from made where name = 't'), true) $$,
  'P0002', 'Not found', 'only the guardian decides'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d4');
select results_eq(
  $$ select teen_name, holder_name, plan_id from public.duo_approvals() $$,
  $$ values ('Taim', 'Karim', 'plus-glow-duo') $$,
  'the guardian sees what they''re asked to approve'
);
select is(
  (public.decide_duo_guardian((select id from made where name = 't'), true)).guardian_status,
  'approved', 'the guardian approves'
);
select pg_temp.reset_role();
select is(private.plus_tier('00000000-0000-0000-0000-0000000d10d3'), 1, 'and the teen has Glow');
select ok(public.grant_plus_survey_credits() >= 4, 'survey credits go out');
select results_eq(
  $$ select user_id, amount from public.survey_credits
     where reason = 'plus_monthly' and user_id in ('00000000-0000-0000-0000-0000000d10d2', '00000000-0000-0000-0000-0000000d10d3')
     order by user_id $$,
  $$ values ('00000000-0000-0000-0000-0000000d10d2'::uuid, 25), ('00000000-0000-0000-0000-0000000d10d3'::uuid, 10) $$,
  'partners get their plan''s credits on their own'
);

-- ── Sharing slots and swaps ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d1');
select public.queue_add('d10d0000-0000-0000-0000-000000000001');
select public.queue_add('d10d0000-0000-0000-0000-000000000003');
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d2');
select public.queue_add('d10d0000-0000-0000-0000-000000000002');
select results_eq(
  $$ select first_name, name_en, turn from public.household_queue() $$,
  $$ values ('Huda', 'Duo game 1', 1), ('Peri', 'Duo game 2', 2), ('Huda', 'Duo game 3', 3) $$,
  'swaps alternate between the two queues'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d2');
select throws_ok($$ select public.set_duo_swap_order('partner') $$, '42501', 'Not a Duo plan',
  'only the holder sets the order');
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d1');
select public.set_duo_swap_order('partner');
select results_eq(
  $$ select product_id from public.household_queue() order by turn limit 1 $$,
  $$ values ('d10d0000-0000-0000-0000-000000000002'::uuid) $$,
  'the holder can put the partner''s queue first'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d2');
select lives_ok(
  $$ select public.book_swap('{}', '{d10d0000-0000-0000-0000-000000000001,d10d0000-0000-0000-0000-000000000002}', 'home') $$,
  'the partner books a swap'
);
select pg_temp.reset_role();
select results_eq(
  $$ select r.user_id, r.product_id, s.area_id from public.rentals r join public.plus_swaps s on s.id = r.swap_id
     order by r.product_id $$,
  $$ values
    ('00000000-0000-0000-0000-0000000d10d1'::uuid, 'd10d0000-0000-0000-0000-000000000001'::uuid, 'd10d0000-0000-0000-0000-0000000000b1'::uuid),
    ('00000000-0000-0000-0000-0000000d10d2'::uuid, 'd10d0000-0000-0000-0000-000000000002'::uuid, 'd10d0000-0000-0000-0000-0000000000b1'::uuid) $$,
  'to the holder''s address, each item to whoever queued it'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d2');
select ok(
  (public.my_duo() ->> 'swap_date') is not null and (public.my_duo() ->> 'has_home')::boolean,
  'the partner sees the household''s booked swap and that the holder has an address'
);
select results_eq(
  $$ select slots, in_use from public.my_rental_allowance() $$,
  $$ values (2, 2) $$,
  'the two slots are shared'
);
select throws_ok(
  $$ select public.request_rental('d10d0000-0000-0000-0000-000000000003', null) $$,
  '23514', 'No free rental slots', 'so neither can take a third'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d1');
select throws_ok(
  $$ select public.book_swap('{}', '{d10d0000-0000-0000-0000-000000000003}', 'home') $$,
  '23514', 'A swap is already booked', 'one booked swap per Duo'
);

-- ── Removing and leaving ──
select throws_ok(
  $$ select public.remove_duo_partner() $$,
  '23514', 'Their rentals must be returned first', 'removing waits for the partner''s rentals'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d2');
select lives_ok($$ select public.leave_duo() $$, 'the partner leaves at any time');
select pg_temp.reset_role();
select results_eq(
  $$ select (select count(*)::integer from public.rentals where user_id = '00000000-0000-0000-0000-0000000d10d1'),
            (select user_id from public.plus_swaps where status = 'booked'),
            private.plus_tier('00000000-0000-0000-0000-0000000d10d2') $$,
  $$ values (2, '00000000-0000-0000-0000-0000000d10d1'::uuid, 0) $$,
  'what they had at the shared address stays with the holder, and their Plus ends'
);

-- X joins, and is removed from the next renewal.
update public.plus_swaps set status = 'cancelled';
update public.rentals set user_id = '00000000-0000-0000-0000-0000000d10d5';
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d1');
insert into made select 'x', (i).invite_token, (i).id from (select public.invite_duo_partner() i) x;
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d6');
select public.accept_duo_invite((select token from made where name = 'x'));
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d1');
select is(
  (public.remove_duo_partner()).ends_at,
  (select current_period_end from public.subscriptions where id = 'd10d0000-0000-0000-0000-0000000000a1'),
  'removal takes effect at the renewal'
);
select is(public.my_duo() ->> 'partner_status', 'ending', 'the holder sees the place ending');
select pg_temp.login_as('00000000-0000-0000-0000-0000000d10d6');
select throws_ok(
  $$ select public.book_swap('{}', '{d10d0000-0000-0000-0000-000000000003}', 'home') $$,
  '23514', 'Your Duo place ends at the renewal', 'nothing new comes for a removed partner'
);

select pg_temp.reset_role();
update public.plus_members set ends_at = now() - interval '1 minute'
where user_id = '00000000-0000-0000-0000-0000000d10d6';
select is(public.end_duo_partners(), 1, 'the cron ends the place at the renewal');
select results_eq(
  $$ select end_reason, left_at is not null from public.plus_members where user_id = '00000000-0000-0000-0000-0000000d10d6' $$,
  $$ values ('removed', true) $$,
  'as removed'
);

-- A Duo that changes to another plan ends the partner's place.
update public.subscriptions set plan_id = 'plus-glow' where id = 'd10d0000-0000-0000-0000-0000000000a7';
select is(private.plus_tier('00000000-0000-0000-0000-0000000d10d3'), 0, 'off a Duo plan, the partner has no Plus');
select is(public.end_duo_partners(), 1, 'and the cron ends their place');

select * from finish();
rollback;
