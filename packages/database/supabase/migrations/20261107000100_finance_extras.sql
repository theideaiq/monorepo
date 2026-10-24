-- Finance features carried over from the old back office: ledger scenarios
-- (actual, forecast, budget), multi-currency entries, report dimensions on
-- ledger lines, financial settings, fixed assets with straight-line
-- depreciation, and SAFE / convertible-note terms on the cap table.

-- ── Ledger ──────────────────────────────────────────────────────────────────

create type public.ledger_scenario as enum ('actual', 'forecast', 'budget');

-- Line amounts stay in IQD; an entry booked in another currency records the
-- original currency and the rate used (IQD per unit) for reference.
alter table public.ledger_entries
  add column scenario public.ledger_scenario not null default 'actual',
  add column currency char(3) not null default 'IQD' check (currency ~ '^[A-Z]{3}$'),
  add column exchange_rate numeric(18, 6) not null default 1 check (exchange_rate > 0),
  add constraint ledger_entries_iqd_rate check (currency <> 'IQD' or exchange_rate = 1);

create index ledger_entries_scenario_date_idx on public.ledger_entries (scenario, entry_date desc);

-- Free-form tags for slicing reports, e.g. {"product_line": "plus", "branch": "mansour"}.
alter table public.ledger_lines
  add column dimensions jsonb not null default '{}'::jsonb check (jsonb_typeof(dimensions) = 'object');

drop function public.post_journal_entry(date, text, jsonb, text);

-- Posts a balanced journal entry atomically.
-- lines: [{"account_id": "…", "debit": 1000, "credit": 0, "memo": "…", "dimensions": {…}}]
create function public.post_journal_entry(
  entry_date date,
  description text,
  lines jsonb,
  reference text default null,
  scenario public.ledger_scenario default 'actual',
  currency char(3) default 'IQD',
  exchange_rate numeric default 1
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry_id uuid;
  total_debit bigint;
  total_credit bigint;
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance staff only' using errcode = 'insufficient_privilege';
  end if;

  if jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) < 2 then
    raise exception 'A journal entry needs at least two lines' using errcode = 'check_violation';
  end if;

  select
    sum(coalesce((line ->> 'debit')::bigint, 0)),
    sum(coalesce((line ->> 'credit')::bigint, 0))
  into total_debit, total_credit
  from jsonb_array_elements(lines) line;

  if total_debit <> total_credit or total_debit = 0 then
    raise exception 'Debits and credits must balance' using errcode = 'check_violation';
  end if;

  insert into public.ledger_entries (entry_date, description, reference, scenario, currency, exchange_rate)
  values (
    entry_date,
    description,
    reference,
    scenario,
    upper(currency),
    case when upper(currency) = 'IQD' then 1 else exchange_rate end
  )
  returning id into entry_id;

  insert into public.ledger_lines (entry_id, account_id, debit, credit, memo, dimensions)
  select
    entry_id,
    (line ->> 'account_id')::uuid,
    coalesce((line ->> 'debit')::bigint, 0),
    coalesce((line ->> 'credit')::bigint, 0),
    nullif(line ->> 'memo', ''),
    case when jsonb_typeof(line -> 'dimensions') = 'object' then line -> 'dimensions' else '{}'::jsonb end
  from jsonb_array_elements(lines) line;

  insert into public.audit_logs (action, entity_type, entity_id, metadata)
  values (
    'insert',
    'ledger_entries',
    entry_id::text,
    jsonb_build_object('total', total_debit, 'scenario', scenario)
  );

  return entry_id;
end;
$$;

drop function public.ledger_monthly_summary(date, date);

-- Monthly revenue and expenses for the finance dashboard, per scenario.
create function public.ledger_monthly_summary(
  from_date date,
  to_date date,
  summary_scenario public.ledger_scenario default 'actual'
)
returns table (month date, revenue bigint, expenses bigint, cogs bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance staff only' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    date_trunc('month', e.entry_date)::date,
    coalesce(sum(l.credit - l.debit) filter (where a.type = 'revenue'), 0)::bigint,
    coalesce(sum(l.debit - l.credit) filter (where a.type = 'expense'), 0)::bigint,
    coalesce(sum(l.debit - l.credit) filter (where a.type = 'expense' and a.category = 'cogs'), 0)::bigint
  from public.ledger_entries e
  join public.ledger_lines l on l.entry_id = e.id
  join public.chart_of_accounts a on a.id = l.account_id
  where e.entry_date between from_date and to_date
    and e.scenario = summary_scenario
  group by 1
  order by 1;
end;
$$;

-- ── Financial settings ──────────────────────────────────────────────────────

create table public.financial_settings (
  id boolean primary key default true check (id),
  base_currency char(3) not null default 'IQD' check (base_currency ~ '^[A-Z]{3}$'),
  fiscal_year_start_month smallint not null default 1 check (fiscal_year_start_month between 1 and 12),
  -- Percentages, e.g. 15.00 for 15%.
  corporate_tax_rate numeric(5, 2) not null default 15 check (corporate_tax_rate between 0 and 100),
  vat_rate numeric(5, 2) not null default 0 check (vat_rate between 0 and 100),
  updated_at timestamptz not null default now()
);

insert into public.financial_settings (id) values (true);

create trigger set_updated_at before update on public.financial_settings
  for each row execute function private.set_updated_at();

-- ── Fixed assets ────────────────────────────────────────────────────────────

create table public.fixed_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  category text check (char_length(category) <= 60),
  purchase_date date not null,
  -- IQD
  cost bigint not null check (cost >= 0),
  salvage_value bigint not null default 0 check (salvage_value >= 0),
  useful_life_months integer not null default 36 check (useful_life_months > 0),
  disposed_on date,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salvage_value <= cost),
  check (disposed_on is null or disposed_on >= purchase_date)
);

create trigger set_updated_at before update on public.fixed_assets
  for each row execute function private.set_updated_at();

-- Straight-line depreciation of every asset as of a date: whole months
-- elapsed since purchase (up to disposal), capped at the useful life.
create function public.fixed_asset_schedule(as_of date default current_date)
returns table (
  id uuid,
  name text,
  category text,
  purchase_date date,
  cost bigint,
  monthly_depreciation bigint,
  months_elapsed integer,
  accumulated_depreciation bigint,
  book_value bigint,
  disposed_on date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance staff only' using errcode = 'insufficient_privilege';
  end if;

  return query
  with elapsed as (
    select
      a.*,
      least(
        a.useful_life_months,
        greatest(
          0,
          (
            extract(year from age(least(as_of, coalesce(a.disposed_on, as_of)), a.purchase_date)) * 12
            + extract(month from age(least(as_of, coalesce(a.disposed_on, as_of)), a.purchase_date))
          )::integer
        )
      ) as months
    from public.fixed_assets a
    where a.purchase_date <= as_of
  )
  select
    e.id,
    e.name,
    e.category,
    e.purchase_date,
    e.cost,
    round((e.cost - e.salvage_value)::numeric / e.useful_life_months)::bigint,
    e.months,
    case
      when e.months >= e.useful_life_months then e.cost - e.salvage_value
      else round((e.cost - e.salvage_value)::numeric * e.months / e.useful_life_months)::bigint
    end,
    e.cost - case
      when e.months >= e.useful_life_months then e.cost - e.salvage_value
      else round((e.cost - e.salvage_value)::numeric * e.months / e.useful_life_months)::bigint
    end,
    e.disposed_on
  from elapsed e
  order by e.purchase_date, e.name;
end;
$$;

-- ── Cap table ───────────────────────────────────────────────────────────────

create type public.equity_instrument as enum (
  'common', 'preferred', 'option', 'safe', 'convertible_note'
);

alter table public.equity_holders
  add column instrument public.equity_instrument not null default 'common',
  -- SAFEs and notes: amount invested, valuation cap and discount (percent).
  add column invested_amount numeric(20, 2) check (invested_amount >= 0),
  add column conversion_cap numeric(20, 2) check (conversion_cap >= 0),
  add column discount_rate numeric(5, 2) check (discount_rate between 0 and 100);

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.financial_settings enable row level security;
alter table public.fixed_assets enable row level security;

create policy "Finance reads financial settings"
  on public.financial_settings for select to authenticated
  using (private.has_staff_role('{finance}'));

create policy "Finance edits financial settings"
  on public.financial_settings for update to authenticated
  using (private.has_staff_role('{finance}'))
  with check (private.has_staff_role('{finance}'));

create policy "Finance manages fixed assets"
  on public.fixed_assets for all to authenticated
  using (private.has_staff_role('{finance}'))
  with check (private.has_staff_role('{finance}'));

create trigger audit_financial_settings after update on public.financial_settings
  for each row execute function private.audit_change();
create trigger audit_fixed_assets after insert or update or delete on public.fixed_assets
  for each row execute function private.audit_change();

revoke all on public.financial_settings, public.fixed_assets from anon, authenticated;
grant select on public.financial_settings to authenticated;
grant update (base_currency, fiscal_year_start_month, corporate_tax_rate, vat_rate)
  on public.financial_settings to authenticated;
grant select, insert, update, delete on public.fixed_assets to authenticated;
grant all on public.financial_settings, public.fixed_assets to service_role;

revoke all on function public.post_journal_entry(date, text, jsonb, text, public.ledger_scenario, char, numeric) from public, anon;
revoke all on function public.ledger_monthly_summary(date, date, public.ledger_scenario) from public, anon;
revoke all on function public.fixed_asset_schedule(date) from public, anon;
grant execute on function public.post_journal_entry(date, text, jsonb, text, public.ledger_scenario, char, numeric) to authenticated;
grant execute on function public.ledger_monthly_summary(date, date, public.ledger_scenario) to authenticated;
grant execute on function public.fixed_asset_schedule(date) to authenticated;
