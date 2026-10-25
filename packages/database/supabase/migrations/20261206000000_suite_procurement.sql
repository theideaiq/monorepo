-- The IDEA Suite: procurement for companies.
--
-- A company's owners and admins send a procurement request (what they need,
-- a budget, a date). Support answers with one or more quotes (priced lines,
-- Megastore products or anything else) and sends them; the company accepts
-- one, which becomes a purchase order (the others are withdrawn), or
-- declines. Support marks the order delivered; finance issues its invoice and
-- marks it paid. Every member of the company sees its requests, sent quotes,
-- orders and invoices; drafts stay with staff.

create type public.procurement_status as enum (
  'submitted', 'quoted', 'ordered', 'delivered', 'cancelled'
);
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'declined', 'withdrawn');
create type public.purchase_order_status as enum ('open', 'delivered', 'cancelled');
create type public.invoice_status as enum ('issued', 'paid', 'void');

-- ── Tables ─────────────────────────────────────────────────────────────────

create table public.procurement_requests (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  details text check (char_length(details) <= 4000),
  -- What the company expects to spend, in IQD.
  budget bigint check (budget > 0),
  needed_by date,
  status public.procurement_status not null default 'submitted',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  assigned_to uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index procurement_requests_org_idx on public.procurement_requests (organization_id, created_at desc);
create index procurement_requests_open_idx on public.procurement_requests (created_at)
  where status in ('submitted', 'quoted');
create index procurement_requests_created_by_idx on public.procurement_requests (created_by);
create index procurement_requests_assigned_to_idx on public.procurement_requests (assigned_to);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 5001) unique,
  request_id uuid not null references public.procurement_requests (id) on delete cascade,
  status public.quote_status not null default 'draft',
  notes text check (char_length(notes) <= 2000),
  valid_until date,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  sent_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_request_idx on public.quotes (request_id);
create index quotes_created_by_idx on public.quotes (created_by);
create index quotes_decided_by_idx on public.quotes (decided_by);

create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  position integer not null default 0,
  description text not null check (char_length(description) between 1 and 300),
  -- A Megastore product, when the line is one.
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null check (quantity between 1 and 100000),
  -- IQD per unit.
  unit_price bigint not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create index quote_lines_quote_idx on public.quote_lines (quote_id, position);
create index quote_lines_product_idx on public.quote_lines (product_id);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 7001) unique,
  quote_id uuid not null unique references public.quotes (id) on delete restrict,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- The company's own purchase order number, if it has one.
  customer_reference text check (char_length(customer_reference) between 1 and 100),
  total bigint not null check (total >= 0),
  status public.purchase_order_status not null default 'open',
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  updated_at timestamptz not null default now()
);

create index purchase_orders_org_idx on public.purchase_orders (organization_id, created_at desc);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 9001) unique,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  purchase_order_id uuid not null unique references public.purchase_orders (id) on delete restrict,
  amount bigint not null check (amount >= 0),
  status public.invoice_status not null default 'issued',
  due_on date not null,
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create index invoices_org_idx on public.invoices (organization_id, issued_at desc);
create index invoices_created_by_idx on public.invoices (created_by);

create trigger set_updated_at before update on public.procurement_requests
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.quotes
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.purchase_orders
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.invoices
  for each row execute function private.set_updated_at();

create trigger audit_procurement_requests after update or delete on public.procurement_requests
  for each row execute function private.audit_change();
create trigger audit_quotes after update or delete on public.quotes
  for each row execute function private.audit_change();
create trigger audit_purchase_orders after insert or update on public.purchase_orders
  for each row execute function private.audit_change();
create trigger audit_invoices after insert or update on public.invoices
  for each row execute function private.audit_change();

-- ── Helpers ────────────────────────────────────────────────────────────────

create function private.quote_org(quote uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.organization_id from public.quotes q
  join public.procurement_requests r on r.id = q.request_id
  where q.id = quote;
$$;

create function private.quote_total(quote uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(l.quantity * l.unit_price), 0)::bigint
  from public.quote_lines l where l.quote_id = quote;
$$;

-- Notifies a company's owners and admins.
create function private.notify_org_admins(org uuid, event text, data jsonb, link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, event, data, link)
  select m.user_id, 'order', event, data, link
  from public.memberships m
  where m.organization_id = org and m.role in ('owner', 'admin');
$$;

-- Support and finance see the companies they serve (name, plan).
drop policy "Members see their organizations" on public.organizations;
create policy "Members, support and finance see organizations"
  on public.organizations for select to authenticated
  using (private.is_org_member(id) or private.has_staff_role('{support,finance}'));

-- ── Row Level Security ─────────────────────────────────────────────────────

alter table public.procurement_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_lines enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.invoices enable row level security;

create policy "Company members and staff see procurement requests"
  on public.procurement_requests for select to authenticated
  using (
    private.is_org_member(organization_id)
    or private.has_staff_role('{support,finance}')
  );

create policy "Company owners and admins send requests"
  on public.procurement_requests for insert to authenticated
  with check (
    private.has_org_role(organization_id, '{owner,admin}')
    and created_by = (select auth.uid())
    and status = 'submitted'
    and assigned_to is null
  );

create policy "Support handles requests"
  on public.procurement_requests for update to authenticated
  using (private.has_staff_role('{support}'))
  with check (private.has_staff_role('{support}'));

create policy "Staff see quotes; companies see the ones sent to them"
  on public.quotes for select to authenticated
  using (
    private.has_staff_role('{support,finance}')
    or (status <> 'draft' and private.is_org_member(private.quote_org(id)))
  );

create policy "Support writes quotes"
  on public.quotes for insert to authenticated
  with check (private.has_staff_role('{support}') and status = 'draft');

create policy "Support edits draft quotes"
  on public.quotes for update to authenticated
  using (private.has_staff_role('{support}') and status = 'draft')
  with check (private.has_staff_role('{support}') and status = 'draft');

create policy "Support deletes draft quotes"
  on public.quotes for delete to authenticated
  using (private.has_staff_role('{support}') and status = 'draft');

create policy "Lines follow their quote"
  on public.quote_lines for select to authenticated
  using (exists (select 1 from public.quotes q where q.id = quote_id));

create policy "Support writes the lines of draft quotes"
  on public.quote_lines for insert to authenticated
  with check (
    private.has_staff_role('{support}')
    and exists (select 1 from public.quotes q where q.id = quote_id and q.status = 'draft')
  );

create policy "Support edits the lines of draft quotes"
  on public.quote_lines for update to authenticated
  using (
    private.has_staff_role('{support}')
    and exists (select 1 from public.quotes q where q.id = quote_id and q.status = 'draft')
  )
  with check (
    private.has_staff_role('{support}')
    and exists (select 1 from public.quotes q where q.id = quote_id and q.status = 'draft')
  );

create policy "Support deletes the lines of draft quotes"
  on public.quote_lines for delete to authenticated
  using (
    private.has_staff_role('{support}')
    and exists (select 1 from public.quotes q where q.id = quote_id and q.status = 'draft')
  );

create policy "Company members and staff see purchase orders"
  on public.purchase_orders for select to authenticated
  using (
    private.is_org_member(organization_id)
    or private.has_staff_role('{support,finance}')
  );

create policy "Company members and finance see invoices"
  on public.invoices for select to authenticated
  using (
    private.is_org_member(organization_id)
    or private.has_staff_role('{support,finance}')
  );

revoke all on public.procurement_requests, public.quotes, public.quote_lines,
  public.purchase_orders, public.invoices from anon, authenticated;

grant select on public.procurement_requests, public.quotes, public.quote_lines,
  public.purchase_orders, public.invoices to authenticated;
grant insert (organization_id, title, details, budget, needed_by, created_by)
  on public.procurement_requests to authenticated;
grant update (assigned_to) on public.procurement_requests to authenticated;
grant insert (request_id, notes, valid_until, created_by) on public.quotes to authenticated;
grant update (notes, valid_until) on public.quotes to authenticated;
grant delete on public.quotes to authenticated;
grant insert (quote_id, position, description, product_id, quantity, unit_price)
  on public.quote_lines to authenticated;
grant update (position, description, product_id, quantity, unit_price)
  on public.quote_lines to authenticated;
grant delete on public.quote_lines to authenticated;

grant all on public.procurement_requests, public.quotes, public.quote_lines,
  public.purchase_orders, public.invoices to service_role;

-- ── Steps ──────────────────────────────────────────────────────────────────

-- Support sends a draft quote with at least one line.
create function private.send_quote(quote uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.quotes;
  request public.procurement_requests;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Support only' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.quotes q where q.id = quote for update;
  if target.id is null or target.status <> 'draft' then
    raise exception 'Only a draft quote can be sent' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.quote_lines l where l.quote_id = quote) then
    raise exception 'A quote needs at least one line' using errcode = 'check_violation';
  end if;
  select * into request from public.procurement_requests r where r.id = target.request_id for update;
  if request.status not in ('submitted', 'quoted') then
    raise exception 'This request is closed' using errcode = 'check_violation';
  end if;

  update public.quotes set status = 'sent', sent_at = now() where id = quote;
  update public.procurement_requests set status = 'quoted' where id = request.id;
  perform private.notify_org_admins(
    request.organization_id, 'quote_sent',
    jsonb_build_object('number', target.number, 'request', request.number,
      'title', request.title, 'total', private.quote_total(quote)),
    '/business/procurement/' || request.id
  );
end;
$$;

-- A company owner or admin accepts a sent quote (it becomes a purchase
-- order and the request's other quotes are withdrawn) or declines it.
create function private.decide_quote(quote uuid, accept boolean, reference text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.quotes;
  request public.procurement_requests;
  order_id uuid;
begin
  select * into target from public.quotes q where q.id = quote for update;
  if target.id is null then
    raise exception 'No such quote' using errcode = 'no_data_found';
  end if;
  select * into request from public.procurement_requests r where r.id = target.request_id for update;
  if not private.has_org_role(request.organization_id, '{owner,admin}') then
    raise exception 'Company owners and admins only' using errcode = 'insufficient_privilege';
  end if;
  if target.status <> 'sent' or request.status <> 'quoted' then
    raise exception 'This quote can no longer be answered' using errcode = 'check_violation';
  end if;
  if target.valid_until is not null and target.valid_until < (now() at time zone 'Asia/Baghdad')::date then
    raise exception 'This quote has expired' using errcode = 'check_violation';
  end if;

  update public.quotes
  set status = case when accept then 'accepted'::public.quote_status else 'declined' end,
    decided_at = now(), decided_by = (select auth.uid())
  where id = quote;

  if not accept then
    return null;
  end if;

  update public.quotes set status = 'withdrawn'
  where request_id = request.id and id <> quote and status in ('draft', 'sent');
  insert into public.purchase_orders (quote_id, organization_id, customer_reference, total)
  values (quote, request.organization_id, nullif(trim(reference), ''), private.quote_total(quote))
  returning id into order_id;
  update public.procurement_requests set status = 'ordered' where id = request.id;
  return order_id;
end;
$$;

-- A company owner or admin cancels a request that has no order yet.
create function private.cancel_procurement_request(request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.procurement_requests;
begin
  select * into target from public.procurement_requests r where r.id = request for update;
  if target.id is null then
    raise exception 'No such request' using errcode = 'no_data_found';
  end if;
  if not (private.has_org_role(target.organization_id, '{owner,admin}') or private.has_staff_role('{support}')) then
    raise exception 'Company owners and admins only' using errcode = 'insufficient_privilege';
  end if;
  if target.status not in ('submitted', 'quoted') then
    raise exception 'Only an open request can be cancelled' using errcode = 'check_violation';
  end if;
  update public.procurement_requests set status = 'cancelled' where id = request;
  update public.quotes set status = 'withdrawn' where request_id = request and status in ('draft', 'sent');
end;
$$;

-- Support marks an order delivered (or cancels it).
create function private.set_purchase_order_status(purchase_order uuid, new_status public.purchase_order_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.purchase_orders;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Support only' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.purchase_orders o where o.id = purchase_order for update;
  if target.id is null or target.status <> 'open' or new_status = 'open' then
    raise exception 'Only an open order can be delivered or cancelled' using errcode = 'check_violation';
  end if;
  update public.purchase_orders
  set status = new_status,
    delivered_at = case when new_status = 'delivered' then now() end
  where id = purchase_order;
  update public.procurement_requests r
  set status = case when new_status = 'delivered' then 'delivered'::public.procurement_status else 'cancelled' end
  from public.quotes q
  where q.id = target.quote_id and r.id = q.request_id;
end;
$$;

-- Finance invoices an order once (its total), due in `days` days.
create function private.issue_invoice(purchase_order uuid, days integer default 30)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.purchase_orders;
  invoice_id uuid;
  invoice_number bigint;
  due date := (now() at time zone 'Asia/Baghdad')::date + greatest(least(days, 120), 0);
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance only' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.purchase_orders o where o.id = purchase_order;
  if target.id is null or target.status = 'cancelled' then
    raise exception 'This order can''t be invoiced' using errcode = 'check_violation';
  end if;
  insert into public.invoices (organization_id, purchase_order_id, amount, due_on)
  values (target.organization_id, purchase_order, target.total, due)
  returning id, number into invoice_id, invoice_number;
  perform private.notify_org_admins(
    target.organization_id, 'invoice_issued',
    jsonb_build_object('number', invoice_number, 'amount', target.total, 'due_on', due),
    '/business/invoices'
  );
  return invoice_id;
end;
$$;

-- Finance records a payment or voids an invoice.
create function private.set_invoice_status(invoice uuid, new_status public.invoice_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance only' using errcode = 'insufficient_privilege';
  end if;
  update public.invoices
  set status = new_status,
    paid_at = case when new_status = 'paid' then now() end
  where id = invoice and status = 'issued' and new_status <> 'issued';
  if not found then
    raise exception 'Only an issued invoice can be paid or voided' using errcode = 'check_violation';
  end if;
end;
$$;

-- ── Public wrappers ────────────────────────────────────────────────────────

create function public.send_quote(quote uuid)
returns void language sql volatile security invoker set search_path = ''
as $$ select private.send_quote(quote) $$;

create function public.decide_quote(quote uuid, accept boolean, reference text default null)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select private.decide_quote(quote, accept, reference) $$;

create function public.cancel_procurement_request(request uuid)
returns void language sql volatile security invoker set search_path = ''
as $$ select private.cancel_procurement_request(request) $$;

create function public.set_purchase_order_status(purchase_order uuid, new_status public.purchase_order_status)
returns void language sql volatile security invoker set search_path = ''
as $$ select private.set_purchase_order_status(purchase_order, new_status) $$;

create function public.issue_invoice(purchase_order uuid, days integer default 30)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select private.issue_invoice(purchase_order, days) $$;

create function public.set_invoice_status(invoice uuid, new_status public.invoice_status)
returns void language sql volatile security invoker set search_path = ''
as $$ select private.set_invoice_status(invoice, new_status) $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.quote_org(uuid) from public, anon;
grant execute on function private.quote_org(uuid) to authenticated, service_role;
revoke all on function private.quote_total(uuid) from public, anon, authenticated;
revoke all on function private.notify_org_admins(uuid, text, jsonb, text) from public, anon, authenticated;

revoke all on function private.send_quote(uuid) from public, anon;
grant execute on function private.send_quote(uuid) to authenticated, service_role;
revoke all on function public.send_quote(uuid) from public, anon;
grant execute on function public.send_quote(uuid) to authenticated, service_role;

revoke all on function private.decide_quote(uuid, boolean, text) from public, anon;
grant execute on function private.decide_quote(uuid, boolean, text) to authenticated, service_role;
revoke all on function public.decide_quote(uuid, boolean, text) from public, anon;
grant execute on function public.decide_quote(uuid, boolean, text) to authenticated, service_role;

revoke all on function private.cancel_procurement_request(uuid) from public, anon;
grant execute on function private.cancel_procurement_request(uuid) to authenticated, service_role;
revoke all on function public.cancel_procurement_request(uuid) from public, anon;
grant execute on function public.cancel_procurement_request(uuid) to authenticated, service_role;

revoke all on function private.set_purchase_order_status(uuid, public.purchase_order_status) from public, anon;
grant execute on function private.set_purchase_order_status(uuid, public.purchase_order_status) to authenticated, service_role;
revoke all on function public.set_purchase_order_status(uuid, public.purchase_order_status) from public, anon;
grant execute on function public.set_purchase_order_status(uuid, public.purchase_order_status) to authenticated, service_role;

revoke all on function private.issue_invoice(uuid, integer) from public, anon;
grant execute on function private.issue_invoice(uuid, integer) to authenticated, service_role;
revoke all on function public.issue_invoice(uuid, integer) from public, anon;
grant execute on function public.issue_invoice(uuid, integer) to authenticated, service_role;

revoke all on function private.set_invoice_status(uuid, public.invoice_status) from public, anon;
grant execute on function private.set_invoice_status(uuid, public.invoice_status) to authenticated, service_role;
revoke all on function public.set_invoice_status(uuid, public.invoice_status) from public, anon;
grant execute on function public.set_invoice_status(uuid, public.invoice_status) to authenticated, service_role;
