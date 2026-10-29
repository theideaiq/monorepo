-- Arabic names: search folds ب/پ, ك/ق/گ/ک, ا/أ/إ/آ and ي/ی/ى in the one
-- function used for the index and the query, and the plans speak the
-- Arabic names.
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
select plan(14);

-- ── Folding ──
select is(private.normalize_search('بلص'), private.normalize_search('پلص'), 'ب and پ are one letter');
select is(private.normalize_search('سوق'), private.normalize_search('سوگ'), 'ق and گ are one letter');
select is(private.normalize_search('سوک'), private.normalize_search('سوگ'), 'Kurdish keheh ک and گ are one letter');
select is(private.normalize_search('سوك'), private.normalize_search('سوگ'), 'ك and گ are one letter');
select is(private.normalize_search('أيديا'), private.normalize_search('ايديا'), 'أ folds to ا');
select is(private.normalize_search('آيديا'), private.normalize_search('ايديا'), 'آ folds to ا');
select is(private.normalize_search('إيديا'), private.normalize_search('ايديا'), 'إ folds to ا');
select is(private.normalize_search('ايدیى'), private.normalize_search('ايديي'), 'ی and ى fold to ي');

-- ── Searching ──
insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind) values
  ('9a9e0000-0000-0000-0000-000000000001', 'plus-card-9zzzz', 'بطاقة ايديا پلص', 'Plus card', 59750, 5, 'active', 'sale'),
  ('9a9e0000-0000-0000-0000-000000000002', 'souk-bag-9zzzz', 'حقيبة السوگ', 'Store bag', 9750, 5, 'active', 'sale');

select pg_temp.login_anon();
select ok(
  '9a9e0000-0000-0000-0000-000000000001' in (select id from public.search_products('بلص')),
  '"بلص" finds "پلص"'
);
select ok(
  '9a9e0000-0000-0000-0000-000000000002' in (select id from public.search_products('سوق')),
  '"سوق" finds "سوگ"'
);
select ok(
  '9a9e0000-0000-0000-0000-000000000002' in (select id from public.search_products('سوک')),
  '"سوک" finds "سوگ"'
);
select ok(
  '9a9e0000-0000-0000-0000-000000000001' in (select id from public.search_products('أيديا')),
  '"أيديا" finds "ايديا"'
);
select ok(
  '9a9e0000-0000-0000-0000-000000000001' in (select id from public.search_products('آيديا')),
  '"آيديا" finds "ايديا"'
);

-- ── The plans ──
select pg_temp.reset_role();
select is(
  (select count(*)::integer from public.plans
   where coalesce(name_ar, '') || array_to_string(features_ar, '|') ~ '(Bulbs|Plus)'),
  0, 'the plans'' Arabic names and features use the Arabic names'
);

select * from finish();
rollback;
