-- Back office: customer relationship notes, marketing campaigns and the
-- company's finances (double-entry ledger, payroll plan, cap table).
--
-- Everything here is staff-only. Customers can only control their own
-- marketing consent (`profiles.marketing_opt_in`); campaigns are sent by
-- apps/api to opted-in customers only.

create type public.crm_status as enum ('lead', 'customer', 'vip', 'churned');
create type public.campaign_status as enum ('draft', 'sending', 'sent', 'failed');
create type public.account_type as enum ('asset', 'liability', 'equity', 'revenue', 'expense');
create type public.staff_plan_status as enum ('planned', 'hiring', 'active', 'terminated');
create type public.equity_holder_type as enum ('founder', 'investor', 'employee', 'advisor');

alter table public.profiles
  add column marketing_opt_in boolean not null default false;

grant update (marketing_opt_in) on public.profiles to authenticated;
grant select (marketing_opt_in) on public.profiles to authenticated;

-- ── CRM ─────────────────────────────────────────────────────────────────────

create table public.crm_contacts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status public.crm_status not null default 'lead',
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  notes text check (char_length(notes) <= 10000),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create index crm_contacts_status_idx on public.crm_contacts (status);
create index crm_contacts_tags_idx on public.crm_contacts using gin (tags);

-- ── Marketing ───────────────────────────────────────────────────────────────

create table public.marketing_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  -- {"crm_status": ["vip"], "tags": ["gamer"], "plus_member": true, "locale": "ar"}
  criteria jsonb not null default '{}'::jsonb check (jsonb_typeof(criteria) = 'object'),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid references public.marketing_segments (id) on delete set null,
  subject text not null check (char_length(subject) between 1 and 200),
  -- Markdown, rendered into the branded email template.
  body text not null check (char_length(body) between 1 and 50000),
  status public.campaign_status not null default 'draft',
  sent_count integer not null default 0,
  sent_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.marketing_campaigns
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.crm_contacts
  for each row execute function private.set_updated_at();

-- ── Finance: double-entry ledger ────────────────────────────────────────────

create table public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{3,6}$'),
  name text not null check (char_length(name) between 1 and 120),
  type public.account_type not null,
  -- e.g. 'cogs' for cost of goods sold, used by the P&L.
  category text check (char_length(category) <= 60),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  description text not null check (char_length(description) between 1 and 500),
  -- Optional link to a payment, invoice or receipt.
  reference text check (char_length(reference) <= 255),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index ledger_entries_entry_date_idx on public.ledger_entries (entry_date desc);

-- Amounts in IQD. Each line is a debit or a credit, never both.
create table public.ledger_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.ledger_entries (id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts (id),
  debit bigint not null default 0 check (debit >= 0),
  credit bigint not null default 0 check (credit >= 0),
  memo text check (char_length(memo) <= 300),
  check ((debit = 0) <> (credit = 0))
);

create index ledger_lines_entry_id_idx on public.ledger_lines (entry_id);
create index ledger_lines_account_id_idx on public.ledger_lines (account_id);

-- Posts a balanced journal entry atomically.
-- lines: [{"account_id": "…", "debit": 1000, "credit": 0, "memo": "…"}]
create function public.post_journal_entry(
  entry_date date,
  description text,
  lines jsonb,
  reference text default null
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

  insert into public.ledger_entries (entry_date, description, reference)
  values (entry_date, description, reference)
  returning id into entry_id;

  insert into public.ledger_lines (entry_id, account_id, debit, credit, memo)
  select
    entry_id,
    (line ->> 'account_id')::uuid,
    coalesce((line ->> 'debit')::bigint, 0),
    coalesce((line ->> 'credit')::bigint, 0),
    nullif(line ->> 'memo', '')
  from jsonb_array_elements(lines) line;

  insert into public.audit_logs (action, entity_type, entity_id, metadata)
  values ('insert', 'ledger_entries', entry_id::text, jsonb_build_object('total', total_debit));

  return entry_id;
end;
$$;

-- Monthly revenue and expenses for the finance dashboard.
create function public.ledger_monthly_summary(from_date date, to_date date)
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
  group by 1
  order by 1;
end;
$$;

-- ── Finance: payroll plan and cap table ─────────────────────────────────────

create table public.staff_plan (
  id uuid primary key default gen_random_uuid(),
  role_title text not null check (char_length(role_title) between 1 and 120),
  department text not null check (char_length(department) between 1 and 120),
  monthly_salary bigint not null check (monthly_salary >= 0),
  annual_increase_pct numeric(5, 2) not null default 0 check (annual_increase_pct between 0 and 100),
  start_date date,
  status public.staff_plan_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equity_rounds (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  closed_on date,
  currency char(3) not null default 'USD',
  valuation_cap numeric(20, 2) check (valuation_cap >= 0),
  price_per_share numeric(20, 6) check (price_per_share >= 0),
  created_at timestamptz not null default now()
);

create table public.equity_holders (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  type public.equity_holder_type not null,
  round_id uuid references public.equity_rounds (id) on delete set null,
  shares numeric(20, 0) not null check (shares >= 0),
  vesting_start date,
  created_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.staff_plan
  for each row execute function private.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.crm_contacts enable row level security;
alter table public.marketing_segments enable row level security;
alter table public.marketing_campaigns enable row level security;
alter table public.chart_of_accounts enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.ledger_lines enable row level security;
alter table public.staff_plan enable row level security;
alter table public.equity_rounds enable row level security;
alter table public.equity_holders enable row level security;

create policy "Support and marketing see CRM contacts"
  on public.crm_contacts for select to authenticated
  using (private.has_staff_role('{support,marketing}'));

create policy "Support and marketing edit CRM contacts"
  on public.crm_contacts for all to authenticated
  using (private.has_staff_role('{support,marketing}'))
  with check (private.has_staff_role('{support,marketing}'));

create policy "Marketing manages segments"
  on public.marketing_segments for all to authenticated
  using (private.has_staff_role('{marketing}'))
  with check (private.has_staff_role('{marketing}'));

-- Only drafts are editable; apps/api moves campaigns through sending.
create policy "Marketing sees campaigns"
  on public.marketing_campaigns for select to authenticated
  using (private.has_staff_role('{marketing}'));

create policy "Marketing creates drafts"
  on public.marketing_campaigns for insert to authenticated
  with check (private.has_staff_role('{marketing}') and status = 'draft');

create policy "Marketing edits drafts"
  on public.marketing_campaigns for update to authenticated
  using (private.has_staff_role('{marketing}') and status = 'draft')
  with check (private.has_staff_role('{marketing}') and status = 'draft');

create policy "Marketing deletes drafts"
  on public.marketing_campaigns for delete to authenticated
  using (private.has_staff_role('{marketing}') and status = 'draft');

create policy "Finance reads the chart of accounts"
  on public.chart_of_accounts for select to authenticated
  using (private.has_staff_role('{finance}'));

create policy "Finance manages the chart of accounts"
  on public.chart_of_accounts for all to authenticated
  using (private.has_staff_role('{finance}'))
  with check (private.has_staff_role('{finance}'));

-- Entries are posted through post_journal_entry() and never edited.
create policy "Finance reads the ledger"
  on public.ledger_entries for select to authenticated
  using (private.has_staff_role('{finance}'));

create policy "Finance reads ledger lines"
  on public.ledger_lines for select to authenticated
  using (private.has_staff_role('{finance}'));

create policy "Finance manages the staff plan"
  on public.staff_plan for all to authenticated
  using (private.has_staff_role('{finance}'))
  with check (private.has_staff_role('{finance}'));

create policy "Finance manages equity rounds"
  on public.equity_rounds for all to authenticated
  using (private.has_staff_role('{finance}'))
  with check (private.has_staff_role('{finance}'));

create policy "Finance manages equity holders"
  on public.equity_holders for all to authenticated
  using (private.has_staff_role('{finance}'))
  with check (private.has_staff_role('{finance}'));

create trigger audit_crm_contacts after insert or update or delete on public.crm_contacts
  for each row execute function private.audit_change('user_id');
create trigger audit_marketing_campaigns after insert or update or delete on public.marketing_campaigns
  for each row execute function private.audit_change();
create trigger audit_staff_plan after insert or update or delete on public.staff_plan
  for each row execute function private.audit_change();
create trigger audit_equity_holders after insert or update or delete on public.equity_holders
  for each row execute function private.audit_change();

-- ── Privileges ──────────────────────────────────────────────────────────────

revoke all on public.crm_contacts, public.marketing_segments, public.marketing_campaigns,
  public.chart_of_accounts, public.ledger_entries, public.ledger_lines,
  public.staff_plan, public.equity_rounds, public.equity_holders
  from anon, authenticated;

grant select, insert, update, delete on public.crm_contacts, public.marketing_segments,
  public.chart_of_accounts, public.staff_plan, public.equity_rounds, public.equity_holders
  to authenticated;
grant select, delete on public.marketing_campaigns to authenticated;
grant insert (segment_id, subject, body) on public.marketing_campaigns to authenticated;
grant update (segment_id, subject, body) on public.marketing_campaigns to authenticated;
grant select on public.ledger_entries, public.ledger_lines to authenticated;

grant all on public.crm_contacts, public.marketing_segments, public.marketing_campaigns,
  public.chart_of_accounts, public.ledger_entries, public.ledger_lines,
  public.staff_plan, public.equity_rounds, public.equity_holders
  to service_role;

revoke all on function public.post_journal_entry(date, text, jsonb, text) from public, anon;
revoke all on function public.ledger_monthly_summary(date, date) from public, anon;
grant execute on function public.post_journal_entry(date, text, jsonb, text) to authenticated;
grant execute on function public.ledger_monthly_summary(date, date) to authenticated;
