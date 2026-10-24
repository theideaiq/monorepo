-- Step 2 of 2: copy the old data into the new schema.
--
-- Run ONCE, AFTER step 1 and `supabase db push` (see README.md). It reads
-- the `legacy` schema and fills the new tables; the legacy tables are left
-- as they are, so you can check the result before dropping them.
--
-- Everything runs in one transaction: if any statement fails, nothing is
-- imported. NOTICE lines report what was skipped or adjusted.
--
-- What is copied, and how:
--   profiles         every auth user gets a new profile (name, avatar,
--                    suspension). Marketing consent is NOT carried over:
--                    the old email_opt_in defaulted to true, which is not
--                    consent, so everyone starts opted out.
--   staff            old roles admin / superadmin become staff roles
--   crm_contacts     CRM status, tags and notes
--   catalog          categories from the old category enum, products (ids
--                    kept, prices rounded to whole dinars, auction lots as
--                    drafts), variants (duplicate SKUs cleared)
--   orders           orders and their items (totals as one subtotal, no
--                    delivery fee); items without an order are skipped
--   rentals          kept with their product names and due dates
--   finance          chart of accounts, balanced "actual" ledger entries
--                    (forecast scenarios stay in legacy), staff plan, cap
--                    table
--   marketing        segments and campaigns (HTML bodies flattened to text)
--   posts            academy_posts become news posts (published only if
--                    they were published)
--   audit_logs       old admin actions
--
-- Not copied (stay in legacy): carts, wishlists, reviews, notifications,
-- support tickets, payment plans / subscriptions / transactions (the old
-- Stripe-style billing has no equivalent; re-create IDEA Plus plans in the
-- back office), fixed assets, financial settings, rate limits.

begin;

do $$
begin
  if to_regnamespace('legacy') is null or to_regclass('public.staff') is null then
    raise exception 'Run step 1 and `supabase db push` first (the legacy schema and the new tables must both exist).';
  end if;
end;
$$;

-- ── Helpers (dropped automatically at the end of the session) ──────────────

-- A URL slug: lowercase Latin letters, digits and hyphens, or a fallback
-- built from the row id when nothing Latin is left (e.g. Arabic names).
create function pg_temp.slugify(value text, id uuid, max_length integer default 120)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(
      left(
        trim(both '-' from regexp_replace(lower(coalesce(value, '')), '[^a-z0-9]+', '-', 'g')),
        max_length - 9
      ),
      ''
    ),
    'item-' || left(id::text, 8)
  );
$$;

create function pg_temp.whole(value numeric)
returns bigint
language sql
immutable
as $$ select greatest(round(coalesce(value, 0)), 0)::bigint; $$;

-- ── Profiles, staff and CRM ─────────────────────────────────────────────────

insert into public.profiles (id, full_name, avatar_url, banned_at)
select
  u.id,
  left(nullif(trim(coalesce(lp.full_name, u.raw_user_meta_data ->> 'full_name')), ''), 120),
  left(nullif(trim(lp.avatar_url), ''), 2048),
  case when lp.banned then now() end
from auth.users u
left join legacy.profiles lp on lp.id = u.id
on conflict (id) do update set
  full_name = coalesce(public.profiles.full_name, excluded.full_name),
  avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
  banned_at = coalesce(public.profiles.banned_at, excluded.banned_at);

insert into public.staff (user_id, role, title)
select lp.id, lp.role::text::public.staff_role, 'Imported from the old admin console'
from legacy.profiles lp
join auth.users u on u.id = lp.id
where lp.role::text in ('admin', 'superadmin')
on conflict (user_id) do nothing;

insert into public.crm_contacts (user_id, status, tags, notes, updated_by)
select
  lp.id,
  coalesce(lp.crm_status, 'lead')::public.crm_status,
  coalesce(lp.crm_tags[1:20], '{}'),
  left(lp.crm_notes, 10000),
  null
from legacy.profiles lp
join auth.users u on u.id = lp.id
where coalesce(lp.crm_status, 'lead') <> 'lead'
   or cardinality(coalesce(lp.crm_tags, '{}')) > 0
   or nullif(trim(lp.crm_notes), '') is not null
on conflict (user_id) do nothing;

-- ── Catalog ─────────────────────────────────────────────────────────────────

-- One category per old category value and product kind actually in use.
insert into public.product_categories (slug, name_ar, name_en, kind, position)
select
  (case when kind = 'rental' then 'rent-' else '' end) || pg_temp.slugify(category, md5(category)::uuid, 64),
  case category
    when 'gaming' then 'الألعاب'
    when 'laptops' then 'الحواسيب'
    when 'phones' then 'الهواتف'
    when 'books' then 'الكتب'
    when 'tech' then 'التقنية'
    when 'other' then 'أخرى'
    else initcap(replace(category, '_', ' '))
  end || case when kind = 'rental' then ' (للإيجار)' else '' end,
  initcap(replace(category, '_', ' ')) || case when kind = 'rental' then ' (to rent)' else '' end,
  kind::public.product_kind,
  100 + row_number() over (order by kind, category)
from (
  select distinct
    p.category::text as category,
    case when p.type::text = 'rental' then 'rental' else 'sale' end as kind
  from legacy.products p
) used
on conflict (slug) do nothing;

with prepared as (
  select
    p.*,
    case when p.type::text = 'rental' then 'rental' else 'sale' end as new_kind,
    pg_temp.slugify(coalesce(p.slug, p.name), p.id) as base_slug
  from legacy.products p
),
slugged as (
  select
    prepared.*,
    case
      when row_number() over (partition by base_slug order by created_at, id) = 1
        and not exists (select 1 from public.products existing where existing.slug = base_slug)
      then base_slug
      else base_slug || '-' || left(id::text, 8)
    end as new_slug
  from prepared
)
insert into public.products (
  id, slug, kind, status, category_id, name_ar, name_en, description_ar, description_en,
  price, currency, condition, stock_count, images, details, created_at, updated_at
)
select
  s.id,
  s.new_slug,
  s.new_kind::public.product_kind,
  (case when s.type::text = 'auction' then 'draft' else 'active' end)::public.product_status,
  c.id,
  left(s.name, 200),
  left(s.name, 200),
  left(s.description, 10000),
  left(s.description, 10000),
  pg_temp.whole(s.price),
  'IQD',
  coalesce(s.condition::text, 'new')::public.product_condition,
  greatest(coalesce(s.stock_count, 0), 0),
  case
    when cardinality(s.images) > 0 then s.images[1:12]
    else array_remove(array[nullif(trim(s.image_url), '')], null)
  end,
  case when jsonb_typeof(s.details) = 'object' then s.details else '{}'::jsonb end,
  s.created_at,
  s.updated_at
from slugged s
left join public.product_categories c
  on c.slug = (case when s.new_kind = 'rental' then 'rent-' else '' end)
    || pg_temp.slugify(s.category::text, md5(s.category::text)::uuid, 64)
on conflict (id) do nothing;

with ranked as (
  select
    v.*,
    row_number() over (partition by nullif(trim(v.sku), '') order by v.id) as sku_rank
  from legacy.product_variants v
  join public.products p on p.id = v.product_id
)
insert into public.product_variants (id, product_id, sku, attributes, price_override, stock_count, image, position)
select
  r.id,
  r.product_id,
  case
    when r.sku_rank = 1
      and not exists (select 1 from public.product_variants e where e.sku = left(trim(r.sku), 64))
    then left(nullif(trim(r.sku), ''), 64)
  end,
  case when jsonb_typeof(r.attributes) = 'object' then r.attributes else '{}'::jsonb end,
  case when r.price_override is not null then pg_temp.whole(r.price_override) end,
  greatest(coalesce(r.stock_count, 0), 0),
  nullif(trim(r.image_url), ''),
  row_number() over (partition by r.product_id order by r.id)
from ranked r
on conflict (id) do nothing;

-- ── Orders and rentals ──────────────────────────────────────────────────────

insert into public.orders (
  id, user_id, status, subtotal, shipping_fee, total, currency, shipping_address,
  tracking_number, paid_at, created_at
)
select
  o.id,
  case when exists (select 1 from auth.users u where u.id = o.user_id) then o.user_id end,
  coalesce(o.status, 'pending')::public.order_status,
  pg_temp.whole(o.total_amount),
  0,
  pg_temp.whole(o.total_amount),
  'IQD',
  case when jsonb_typeof(o.shipping_address) = 'object' then o.shipping_address else '{}'::jsonb end,
  left(o.tracking_number, 120),
  case when o.status in ('paid', 'shipped', 'delivered') then o.created_at end,
  o.created_at
from legacy.orders o
on conflict (id) do nothing;

insert into public.order_items (id, order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity)
select
  i.id,
  i.order_id,
  p.id,
  null,
  coalesce(p.name, 'Item'),
  coalesce(p.name, 'Item'),
  pg_temp.whole(i.price_at_purchase),
  greatest(coalesce(i.quantity, 1), 1)
from legacy.order_items i
join public.orders o on o.id = i.order_id
left join legacy.products p on p.id = i.product_id
on conflict (id) do nothing;

insert into public.rentals (
  id, user_id, product_id, name_ar, name_en, status, requested_at, started_at, due_at, returned_at, updated_at
)
select
  r.id,
  case when exists (select 1 from auth.users u where u.id = r.user_id) then r.user_id end,
  case when exists (select 1 from public.products np where np.id = r.product_id) then r.product_id end,
  coalesce(p.name, 'Rental item'),
  coalesce(p.name, 'Rental item'),
  r.status::text::public.rental_status,
  r.created_at,
  least(r.created_at, r.due_date - interval '1 day'),
  r.due_date,
  case when r.status::text = 'returned' then r.updated_at end,
  r.updated_at
from legacy.rentals r
left join legacy.products p on p.id = r.product_id
on conflict (id) do nothing;

-- ── Finance ─────────────────────────────────────────────────────────────────

-- Account codes must be 3–6 digits; others get a free 9xxxx code. Accounts
-- without a type are imported as expenses and flagged in their name.
with accounts as (
  select
    a.*,
    a.code ~ '^[0-9]{3,6}$' as code_ok,
    row_number() over (order by a.code) as n
  from legacy.chart_of_accounts a
)
insert into public.chart_of_accounts (id, code, name, type, category)
select
  a.id,
  case when a.code_ok then a.code else (90000 + a.n)::text end,
  left(
    a.name
      || case when a.code_ok then '' else ' (old code ' || a.code || ')' end
      || case when a.type is null then ' (check type)' else '' end,
    120
  ),
  coalesce(a.type, 'expense')::public.account_type,
  case when a.category ilike '%cogs%' then 'cogs' else left(a.category, 60) end
from accounts a
on conflict (id) do nothing;

-- Lines are netted per row (debit − credit), converted to IQD with the
-- entry's exchange rate when it isn't in IQD, and rounded to whole dinars.
-- Only "actual" entries that still balance after that are imported.
create temporary table imported_lines on commit drop as
select
  l.id,
  l.entry_id,
  l.account_id,
  round(
    (coalesce(l.debit, 0) - coalesce(l.credit, 0))
    * case when coalesce(e.currency_code, 'IQD') = 'IQD' then 1 else coalesce(e.exchange_rate, 1) end
  )::bigint as net
from legacy.ledger_lines l
join legacy.ledger_entries e on e.id = l.entry_id
where coalesce(e.scenario::text, 'actual') = 'actual'
  and l.account_id in (select id from public.chart_of_accounts);

delete from imported_lines where net = 0;

create temporary table balanced_entries on commit drop as
select entry_id
from imported_lines
group by entry_id
having sum(net) = 0 and count(*) >= 2;

insert into public.ledger_entries (id, entry_date, description, reference, created_at)
select
  e.id,
  (e.transaction_date at time zone 'Asia/Baghdad')::date,
  left(coalesce(nullif(trim(e.description), ''), 'Imported entry'), 500),
  e.reference_id::text,
  coalesce(e.created_at, now())
from legacy.ledger_entries e
where e.id in (select entry_id from balanced_entries)
on conflict (id) do nothing;

insert into public.ledger_lines (id, entry_id, account_id, debit, credit)
select
  l.id,
  l.entry_id,
  l.account_id,
  greatest(l.net, 0),
  greatest(-l.net, 0)
from imported_lines l
where l.entry_id in (select entry_id from balanced_entries)
on conflict (id) do nothing;

insert into public.staff_plan (id, role_title, department, monthly_salary, annual_increase_pct, start_date, status)
select
  s.id,
  left(s.role_title, 120),
  left(coalesce(s.department, 'General'), 120),
  pg_temp.whole(s.monthly_salary),
  -- The old column stored fractions (0.05 = 5%); the new one stores percent.
  least(
    greatest(
      case when coalesce(s.annual_increase_pct, 0) <= 1
        then coalesce(s.annual_increase_pct, 0) * 100
        else s.annual_increase_pct
      end,
      0
    ),
    100
  ),
  s.hire_date,
  coalesce(s.status, 'planned')::public.staff_plan_status
from legacy.hr_staff_plan s
on conflict (id) do nothing;

-- Rounds are assumed to be in US dollars; change the currency in the back
-- office if a round was priced otherwise.
insert into public.equity_rounds (id, name, closed_on, currency, valuation_cap, price_per_share)
select r.id, left(r.name, 120), r.date_closed, 'USD', r.valuation_cap, r.price_per_share
from legacy.equity_rounds r
on conflict (id) do nothing;

insert into public.equity_holders (id, name, type, round_id, shares, vesting_start)
select
  h.id,
  left(h.name || case when h.type = 'pool' and h.name !~* 'pool' then ' (option pool)' else '' end, 200),
  (case when h.type = 'pool' then 'employee' else coalesce(h.type, 'investor') end)::public.equity_holder_type,
  h.round_id,
  round(greatest(coalesce(h.shares_owned, 0), 0)),
  h.vesting_start_date
from legacy.equity_holders h
on conflict (id) do nothing;

-- ── Marketing ───────────────────────────────────────────────────────────────

-- Old criteria were {role, crm_status}; the new ones take lists of statuses.
insert into public.marketing_segments (id, name, criteria, created_by, created_at)
select
  s.id,
  left(s.name, 120),
  case
    when jsonb_typeof(s.criteria -> 'crm_status') = 'string'
      then jsonb_build_object('crm_status', jsonb_build_array(s.criteria ->> 'crm_status'))
    when jsonb_typeof(s.criteria -> 'crm_status') = 'array'
      then jsonb_build_object('crm_status', s.criteria -> 'crm_status')
    else '{}'::jsonb
  end,
  null,
  coalesce(s.created_at, now())
from legacy.marketing_segments s
on conflict (id) do nothing;

insert into public.marketing_campaigns (id, segment_id, subject, body, status, sent_count, sent_at, created_by, created_at)
select
  c.id,
  c.segment_id,
  left(c.subject, 200),
  left(
    coalesce(
      nullif(
        btrim(
          regexp_replace(regexp_replace(c.body_html, '<br\s*/?>|</p>', E'\n', 'gi'), '<[^>]+>', '', 'g'),
          E' \n\r\t'
        ),
        ''
      ),
      c.subject
    ),
    50000
  ),
  (case when c.status in ('sent', 'failed') then c.status else 'draft' end)::public.campaign_status,
  coalesce(c.sent_count, 0),
  c.sent_at,
  null,
  coalesce(c.created_at, now())
from legacy.marketing_campaigns c
on conflict (id) do nothing;

-- ── News posts ──────────────────────────────────────────────────────────────

with prepared as (
  select a.*, pg_temp.slugify(a.slug, a.id) as base_slug from legacy.academy_posts a
)
insert into public.posts (
  id, slug, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, cover_image,
  author_id, published_at, created_at, updated_at
)
select
  p.id,
  case
    when row_number() over (partition by p.base_slug order by p.created_at) = 1
      and not exists (select 1 from public.posts e where e.slug = p.base_slug)
    then p.base_slug
    else p.base_slug || '-' || left(p.id::text, 8)
  end,
  left(p.title, 200),
  left(p.title, 200),
  left(p.excerpt, 500),
  left(p.excerpt, 500),
  left(coalesce(p.content, ''), 100000),
  left(coalesce(p.content, ''), 100000),
  nullif(trim(p.cover_image), ''),
  case when exists (select 1 from auth.users u where u.id = p.author_id) then p.author_id end,
  case when p.status::text = 'published' then p.created_at end,
  p.created_at,
  p.updated_at
from prepared p
on conflict (id) do nothing;

-- ── Audit log ───────────────────────────────────────────────────────────────

insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
select
  case when exists (select 1 from auth.users u where u.id = l.admin_id) then l.admin_id end,
  left(l.action, 120),
  left(coalesce(nullif(l.target_resource, ''), 'legacy'), 60),
  l.details ->> 'id',
  coalesce(l.details, '{}'::jsonb) || jsonb_build_object('imported_from', 'legacy.audit_logs'),
  l."timestamp"
from legacy.audit_logs l
where not exists (
  select 1 from public.audit_logs existing where existing.metadata ? 'imported_from'
)
order by l."timestamp";

-- ── Let accounts be deleted again ──────────────────────────────────────────
-- Old tables reference auth.users without ON DELETE, which would block
-- account deletion (App Store requirement) until legacy is dropped.

do $$
declare
  r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'legacy'
      and c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end;
$$;

-- ── Report ──────────────────────────────────────────────────────────────────

do $$
declare
  skipped_entries integer;
  skipped_items integer;
begin
  select count(*) into skipped_entries
  from legacy.ledger_entries e
  where coalesce(e.scenario::text, 'actual') = 'actual'
    and e.id not in (select id from public.ledger_entries);
  if skipped_entries > 0 then
    raise notice '% actual ledger entries were not imported (unbalanced after rounding, or fewer than two lines); they remain in legacy.ledger_entries', skipped_entries;
  end if;

  select count(*) into skipped_items
  from legacy.order_items i
  where i.id not in (select id from public.order_items);
  if skipped_items > 0 then
    raise notice '% order items without a valid order were not imported', skipped_items;
  end if;
end;
$$;

select 'profiles' as imported, count(*) from public.profiles
union all select 'staff', count(*) from public.staff
union all select 'crm_contacts', count(*) from public.crm_contacts
union all select 'product_categories', count(*) from public.product_categories
union all select 'products', count(*) from public.products
union all select 'product_variants', count(*) from public.product_variants
union all select 'orders', count(*) from public.orders
union all select 'order_items', count(*) from public.order_items
union all select 'rentals', count(*) from public.rentals
union all select 'chart_of_accounts', count(*) from public.chart_of_accounts
union all select 'ledger_entries', count(*) from public.ledger_entries
union all select 'staff_plan', count(*) from public.staff_plan
union all select 'equity_holders', count(*) from public.equity_holders
union all select 'marketing_campaigns', count(*) from public.marketing_campaigns
union all select 'posts', count(*) from public.posts
union all select 'audit_logs', count(*) from public.audit_logs;

commit;
