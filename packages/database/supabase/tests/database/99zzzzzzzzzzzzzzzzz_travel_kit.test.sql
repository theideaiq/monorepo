-- The UX overhaul: Plus availability in words, Staff's Demand view, and
-- Family (kids' profiles, a teen's requests to their guardian).
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

select plan(20);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f2001', 'editor-kit@example.iq'),
  ('00000000-0000-0000-0000-0000000f2002', 'member-kit@example.iq'),
  ('00000000-0000-0000-0000-0000000f2003', 'other-kit@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000f2001', 'editor');
insert into public.travel_routes (id, slug, country, visa_ar, visa_en, status, checked_on) values
  ('9f300000-0000-0000-0000-0000000000a1', 'cz-study', 'CZ', 'تأشيرة دراسة طويلة', 'Long-stay study visa', 'published', '2026-11-04'),
  ('9f300000-0000-0000-0000-0000000000a2', 'cn-camp', 'CN', 'مخيم شبابي', 'Youth camp', 'draft', null);
insert into public.travel_requirements (id, route_id, kind, doc_key, title_ar, title_en, confidence, source_url, checked_on, anchor, lead_days) values
  ('9f300000-0000-0000-0000-0000000000b1', '9f300000-0000-0000-0000-0000000000a1', 'document', 'passport', 'جواز السفر', 'Passport', 'official', 'https://mzv.gov.cz/erbil/en/', '2026-11-04', null, null),
  ('9f300000-0000-0000-0000-0000000000b2', '9f300000-0000-0000-0000-0000000000a1', 'task', null, 'احجز الموعد', 'Book the appointment', 'official', 'https://mzv.gov.cz/erbil/en/', '2026-11-04', 'appointment', 42),
  ('9f300000-0000-0000-0000-0000000000b3', '9f300000-0000-0000-0000-0000000000a2', 'question', null, 'ما الفئة؟', 'Which category?', 'unconfirmed', 'https://iq.china-embassy.gov.cn/eng/', '2026-11-04', null, null);

-- ── Routes and requirements ──
select throws_ok(
  $$ update public.travel_routes set status = 'published' where id = '9f300000-0000-0000-0000-0000000000a2' $$,
  '23514', null, 'a route is published only once it has been checked'
);
select throws_ok(
  $$ insert into public.travel_requirements (route_id, kind, title_ar, title_en, confidence, source_url, checked_on)
     values ('9f300000-0000-0000-0000-0000000000a1', 'document', 'صورة', 'Photo', 'official', 'https://example.iq', '2026-11-04') $$,
  '23514', null, 'a document needs its key, so its status is shared across trips'
);
select throws_ok(
  $$ insert into public.travel_requirements (route_id, kind, title_ar, title_en, confidence, source_url, checked_on)
     values ('9f300000-0000-0000-0000-0000000000a1', 'task', 'مهمة', 'Task', 'official', 'not a link', '2026-11-04') $$,
  '23514', null, 'every line links to its source'
);

select pg_temp.login_anon();
select results_eq(
  $$ select slug from public.travel_routes order by slug $$,
  $$ values ('cz-study') $$,
  'visitors see published routes only'
);
select results_eq(
  $$ select title_en from public.travel_requirements order by title_en $$,
  $$ values ('Book the appointment'), ('Passport') $$,
  'and the requirements of published routes only'
);
select throws_ok(
  $$ insert into public.travel_routes (slug, country, visa_ar, visa_en) values ('x', 'DE', 'x', 'x') $$,
  '42501', null, 'visitors cannot add routes'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000f2002');
select is(
  (select count(*)::int from public.travel_routes), 1,
  'members see published routes only'
);
select throws_ok(
  $$ insert into public.travel_requirements (route_id, kind, title_ar, title_en, confidence, source_url, checked_on)
     values ('9f300000-0000-0000-0000-0000000000a1', 'task', 'مهمة', 'Task', 'official', 'https://example.iq', '2026-11-04') $$,
  '42501', null, 'members cannot write requirements'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000f2001', 'aal2');
select is(
  (select count(*)::int from public.travel_requirements), 3,
  'editors see drafts too'
);
select lives_ok(
  $$ update public.travel_routes set checked_on = '2026-11-04', status = 'published'
     where id = '9f300000-0000-0000-0000-0000000000a2' $$,
  'editors publish a checked route'
);
update public.travel_routes set status = 'draft' where id = '9f300000-0000-0000-0000-0000000000a2';

-- ── A member's kit ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000f2002');
select lives_ok(
  $$ insert into public.travel_kits (id, route_id, departure_on, appointment_on)
     values ('9f300000-0000-0000-0000-0000000000c1', '9f300000-0000-0000-0000-0000000000a1', '2027-01-20', '2026-12-01') $$,
  'a member starts a kit from a published route'
);
select throws_ok(
  $$ insert into public.travel_kits (route_id) values ('9f300000-0000-0000-0000-0000000000a2') $$,
  '23514', null, 'but not from a draft'
);
select throws_ok(
  $$ insert into public.travel_kits (user_id, route_id)
     values ('00000000-0000-0000-0000-0000000f2003', '9f300000-0000-0000-0000-0000000000a1') $$,
  '42501', null, 'nor for someone else'
);
select lives_ok(
  $$ insert into public.travel_documents (doc_key, status) values ('passport', 'ready') $$,
  'a member marks a document ready, once for every trip'
);
select lives_ok(
  $$ insert into public.travel_kit_ticks (kit_id, requirement_id)
     values ('9f300000-0000-0000-0000-0000000000c1', '9f300000-0000-0000-0000-0000000000b2') $$,
  'and ticks a task in their kit'
);
select throws_ok(
  $$ update public.travel_kits set route_id = '9f300000-0000-0000-0000-0000000000a2'
     where id = '9f300000-0000-0000-0000-0000000000c1' $$,
  '23514', null, 'a kit keeps its route'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000f2003');
select is(
  (select count(*)::int from public.travel_kits) + (select count(*)::int from public.travel_documents)
    + (select count(*)::int from public.travel_kit_ticks), 0,
  'nobody else sees a member''s kit, documents or ticks'
);
select throws_ok(
  $$ insert into public.travel_kit_ticks (kit_id, requirement_id)
     values ('9f300000-0000-0000-0000-0000000000c1', '9f300000-0000-0000-0000-0000000000b1') $$,
  '42501', null, 'nor ticks in it'
);

-- ── Programs: itinerary and costs ──
select pg_temp.reset_role();
select ok(
  private.valid_program_costs('[{"label_ar":"الطيران","label_en":"Flights","included":true,"amount":750000},{"label_ar":"رسم التأشيرة","label_en":"Visa fee","included":false,"amount":null}]')
  and private.valid_program_itinerary('[{"day":1,"title_ar":"الوصول","title_en":"Arrival"}]'),
  'costs and an itinerary in the documented shape are valid'
);
select ok(
  not private.valid_program_costs('[{"label_ar":"x","label_en":"x","included":"yes"}]')
  and not private.valid_program_costs('[{"label_ar":"x","label_en":"x","included":true,"amount":100}]')
  and not private.valid_program_itinerary('[{"day":0,"title_ar":"x","title_en":"x"}]'),
  'malformed costs (amounts end in 250) and days are refused'
);

select * from finish();
rollback;
