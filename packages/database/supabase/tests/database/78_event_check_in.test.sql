-- Event check-in: support reads RSVPs and checks members in.
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
select plan(4);

delete from public.staff;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000078a1', 'cm@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-0000000078a2', 'cs@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-0000000078a3', 'cf@example.iq', '{"full_name":"Finance F"}');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000078a2', 'support'),
  ('00000000-0000-0000-0000-0000000078a3', 'finance');
insert into public.events (id, slug, title_ar, title_en, location, starts_at, published) values
  ('78000000-0000-0000-0000-0000000000e1', 'check-in-night', 'أمسية', 'Night', 'Baghdad', now() + interval '2 hours', true);
insert into public.event_rsvps (event_id, user_id) values
  ('78000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000078a1');

select pg_temp.login_as('00000000-0000-0000-0000-0000000078a2', 'aal2');
select is(
  (select count(*)::integer from public.event_rsvps where event_id = '78000000-0000-0000-0000-0000000000e1'),
  1, 'support sees the RSVPs'
);
select isnt(
  public.check_in_rsvp('78000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000078a1'),
  null, 'support checks the member in'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000078a3', 'aal2');
select throws_ok(
  $$ select public.check_in_rsvp('78000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000078a1') $$,
  '42501', null, 'finance can''t check members in'
);
select pg_temp.reset_role();
select is(
  (select amount from public.bulb_entries
   where user_id = '00000000-0000-0000-0000-0000000078a1' and reason = 'event_check_in'),
  1000, 'the check-in pays 1,000 Bulbs'
);

select * from finish();
rollback;
