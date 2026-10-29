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

select plan(10);

-- G has Plus Glow, B Plus Blaze; X and Y have no Plus.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000ee1', 'g9zzm@example.iq'),
  ('00000000-0000-0000-0000-000000000ee2', 'b9zzm@example.iq'),
  ('00000000-0000-0000-0000-000000000ee3', 'x9zzm@example.iq'),
  ('00000000-0000-0000-0000-000000000ee4', 'y9zzm@example.iq');
insert into public.subscriptions (user_id, plan_id, provider, status, current_period_start, current_period_end) values
  ('00000000-0000-0000-0000-000000000ee1', 'plus-glow', 'wayl', 'active', now(), now() + interval '20 days'),
  ('00000000-0000-0000-0000-000000000ee2', 'plus-blaze', 'wayl', 'active', now(), now() + interval '20 days');

-- 3 seats, 1 held for Blaze; RSVPs open to everyone in a day.
insert into public.events (id, slug, title_ar, title_en, location, starts_at, published, capacity, blaze_seats, rsvp_opens_at) values
  ('9fd00000-0000-0000-0000-0000000000e1', 'club-9zzm', 'أمسية', 'Night', 'Baghdad', now() + interval '10 days', true, 3, 1, now() + interval '1 day');

-- ── Plus members first ──────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000ee3');
select throws_ok(
  $$ insert into public.event_rsvps (event_id) values ('9fd00000-0000-0000-0000-0000000000e1') $$,
  '23514', 'RSVPs aren''t open yet', 'everyone else waits for the opening'
);
select ok(
  (select opens_at > now() from public.event_rsvp_window('9fd00000-0000-0000-0000-0000000000e1')),
  'and is told when it opens'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ee1');
select lives_ok(
  $$ insert into public.event_rsvps (event_id) values ('9fd00000-0000-0000-0000-0000000000e1') $$,
  'Plus members RSVP 48 hours early'
);

-- ── Blaze seats ─────────────────────────────────────────────────────────────

select pg_temp.reset_role();
update public.events set rsvp_opens_at = now() - interval '1 hour' where id = '9fd00000-0000-0000-0000-0000000000e1';
select pg_temp.login_as('00000000-0000-0000-0000-000000000ee3');
select lives_ok(
  $$ insert into public.event_rsvps (event_id) values ('9fd00000-0000-0000-0000-0000000000e1') $$,
  'once open, everyone can RSVP'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ee4');
select is(
  (select seats_left from public.event_rsvp_window('9fd00000-0000-0000-0000-0000000000e1')),
  0, 'the seat held for Blaze isn''t theirs'
);
select throws_ok(
  $$ insert into public.event_rsvps (event_id) values ('9fd00000-0000-0000-0000-0000000000e1') $$,
  '23514', 'This event is full', 'so the event is full for them'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ee2');
select lives_ok(
  $$ insert into public.event_rsvps (event_id) values ('9fd00000-0000-0000-0000-0000000000e1') $$,
  'Blaze takes the held seat'
);

-- 24 hours before the start, unclaimed Blaze seats open to all.
select pg_temp.reset_role();
insert into public.events (id, slug, title_ar, title_en, location, starts_at, published, capacity, blaze_seats, rsvp_opens_at) values
  ('9fd00000-0000-0000-0000-0000000000e2', 'soon-9zzm', 'قريبًا', 'Soon', 'Baghdad', now() + interval '12 hours', true, 1, 1, now() - interval '1 day');
select pg_temp.login_as('00000000-0000-0000-0000-000000000ee4');
select lives_ok(
  $$ insert into public.event_rsvps (event_id) values ('9fd00000-0000-0000-0000-0000000000e2') $$,
  'unclaimed Blaze seats open to all a day before'
);

-- ── Publishing ─────────────────────────────────────────────────────────────

select pg_temp.reset_role();
insert into public.events (id, slug, title_ar, title_en, location, starts_at, published) values
  ('9fd00000-0000-0000-0000-0000000000e3', 'later-9zzm', 'لاحقًا', 'Later', 'Baghdad', now() + interval '10 days', true),
  ('9fd00000-0000-0000-0000-0000000000e4', 'tonight-9zzm', 'الليلة', 'Tonight', 'Baghdad', now() + interval '6 hours', true);
select results_eq(
  $$ select rsvp_opens_at between now() + interval '47 hours' and now() + interval '49 hours'
     from public.events where id = '9fd00000-0000-0000-0000-0000000000e3' $$,
  $$ values (true) $$,
  'published without an opening, RSVPs open to everyone 48 hours later'
);
select results_eq(
  $$ select rsvp_opens_at = starts_at from public.events where id = '9fd00000-0000-0000-0000-0000000000e4' $$,
  $$ values (true) $$,
  'at the latest when it starts'
);

select * from finish();
rollback;
