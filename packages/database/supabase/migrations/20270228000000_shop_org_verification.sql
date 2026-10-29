-- Verification, part 2 (28 October brief, step 13): shop kinds and
-- organization verification.
--
-- Shops are either registered (commercial registration plus the owner's ID:
-- no limits) or individual traders (the owner's ID only), whose sales are
-- capped each Baghdad calendar month by `store_settings.individual_monthly_limit`,
-- set in Staff. A new application is an individual trader until it says
-- otherwise (or staff change it); shops approved before this were reviewed
-- with their documents and stay registered.
--
-- Organizations verify by a domain they already proved in Partners →
-- Developers, or by an official letter in their organization folder.
-- Student societies also upload their university's approval, so they are
-- always reviewed. Reviews go to Staff → Inbox with the other checks.

-- ── Shop kinds ─────────────────────────────────────────────────────────────

create type public.shop_kind as enum ('registered', 'individual');

alter table public.sellers add column kind public.shop_kind;
update public.sellers set kind = 'registered' where not is_house;
alter table public.sellers
  alter column kind set default 'individual',
  add constraint sellers_kind_check check (is_house = (kind is null));

comment on column public.sellers.kind is
  'registered (commercial registration: no limits) or individual (owner''s ID only: a monthly sales limit). Null for The IDEA.';

alter table public.store_settings
  add column individual_monthly_limit bigint not null default 5000000
    check (individual_monthly_limit >= 0);

comment on column public.store_settings.individual_monthly_limit is
  'The most an individual trader may sell in a Baghdad calendar month (IQD, cancelled and refunded lines aside).';

-- What a shop has sold this Baghdad month: every line except cancelled or
-- refunded ones.
create function private.shop_month_sales(shop uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(i.unit_price * i.quantity), 0)::bigint
  from public.order_items i
  join public.orders o on o.id = i.order_id
  where i.seller_id = shop
    and i.refunded_at is null
    and o.status not in ('cancelled', 'refunded')
    and o.created_at >= (date_trunc('month', now() at time zone 'Asia/Baghdad') at time zone 'Asia/Baghdad');
$$;

-- Individual traders can't sell past their monthly limit. Their shop row
-- is locked so two checkouts can't pass the check together (The IDEA's and
-- registered shops' rows aren't, so their checkouts don't queue).
create function private.check_shop_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop public.sellers;
begin
  if not exists (
    select 1 from public.sellers s where s.id = new.seller_id and s.kind = 'individual'
  ) then
    return new;
  end if;
  select * into shop from public.sellers s where s.id = new.seller_id for update;
  if private.shop_month_sales(shop.id) + new.unit_price * new.quantity
     > (select s.individual_monthly_limit from public.store_settings s) then
    raise exception '% has reached its monthly sales limit', shop.name
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_shop_limit
  before insert on public.order_items
  for each row when (new.seller_id is not null)
  execute function private.check_shop_limit();

-- Applying now says which kind of shop; staff can change it.
drop function public.apply_to_sell(uuid, text);
drop function private.apply_to_sell(uuid, text);

create function private.apply_to_sell(
  org uuid,
  seller_name text,
  shop_kind public.shop_kind default 'individual'
)
returns public.sellers
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.sellers;
begin
  if not private.has_org_role(org, '{owner,admin}') then
    raise exception 'Only owners and admins can apply' using errcode = '42501';
  end if;

  insert into public.sellers (organization_id, name, kind)
  values (org, trim(seller_name), coalesce(shop_kind, 'individual'))
  on conflict (organization_id) do update
    set name = excluded.name,
        -- A rejected application can be sent again; others keep their
        -- status and kind (staff change an approved shop's kind).
        kind = case when sellers.status in ('pending', 'rejected') then excluded.kind else sellers.kind end,
        status = case when sellers.status = 'rejected' then 'pending' else sellers.status end,
        applied_at = case when sellers.status = 'rejected' then now() else sellers.applied_at end
  returning * into result;

  insert into public.seller_details (seller_id) values (result.id)
  on conflict (seller_id) do nothing;

  return result;
end;
$$;

create function public.apply_to_sell(
  org uuid,
  seller_name text,
  shop_kind public.shop_kind default 'individual'
)
returns public.sellers
language sql
set search_path = ''
as $$ select * from private.apply_to_sell(org, seller_name, shop_kind) $$;

create function private.set_shop_kind(target uuid, shop_kind public.shop_kind)
returns public.sellers
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.sellers;
begin
  if not private.has_staff_role('{admin}') then
    raise exception 'Staff only' using errcode = '42501';
  end if;
  update public.sellers set kind = shop_kind
  where id = target and not is_house and shop_kind is not null
  returning * into result;
  if result.id is null then
    raise exception 'No such shop' using errcode = 'no_data_found';
  end if;
  return result;
end;
$$;

create function public.set_shop_kind(target uuid, shop_kind public.shop_kind)
returns public.sellers
language sql
set search_path = ''
as $$ select * from private.set_shop_kind(target, shop_kind) $$;

-- A shop's owners and admins (and staff) see how much of the month's limit
-- is used.
create function private.shop_limit(shop uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found public.sellers;
begin
  select * into found from public.sellers s where s.id = shop;
  if found.id is null or not (
    private.has_org_role(found.organization_id, '{owner,admin}')
    or private.has_staff_role('{admin}')
  ) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'kind', found.kind,
    'sold', private.shop_month_sales(found.id),
    'limit', case when found.kind = 'individual'
      then (select s.individual_monthly_limit from public.store_settings s) end
  );
end;
$$;

create function public.shop_limit(shop uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$ select private.shop_limit(shop) $$;

-- ── Organization verification ──────────────────────────────────────────────

create table public.organization_verifications (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  method text not null check (method in ('domain', 'letter')),
  -- The verified domain (Partners → Developers) when the method is domain.
  domain_id uuid references public.pass_partner_domains (id) on delete set null,
  -- Official letter and, for student societies, the university's approval:
  -- paths in the organization's folder of `org-files`.
  letter text check (char_length(letter) <= 500),
  is_student_society boolean not null default false,
  university text check (char_length(trim(university)) between 2 and 160),
  approval text check (char_length(approval) <= 500),
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  reject_reason text check (char_length(reject_reason) <= 500),
  requested_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  verified_at timestamptz,
  constraint organization_verifications_society_check check (
    not is_student_society or (university is not null and approval is not null)
  )
);

comment on table public.organization_verifications is
  'An organization''s verification: by a verified domain or an official letter; student societies add their university''s approval.';

create index organization_verifications_domain_id_idx on public.organization_verifications (domain_id);
create index organization_verifications_requested_by_idx on public.organization_verifications (requested_by);
create index organization_verifications_reviewed_by_idx on public.organization_verifications (reviewed_by);
create index organization_verifications_pending_idx
  on public.organization_verifications (requested_at) where status = 'pending';

alter table public.organization_verifications enable row level security;

create policy "Members and support read organization verifications"
  on public.organization_verifications for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.has_staff_role('{support}'))
  );

grant select on public.organization_verifications to authenticated;

create function private.organization_verified(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_verifications v
    where v.organization_id = org and v.status = 'verified'
  );
$$;

-- Sends the request. A domain the organization already verified needs no
-- review unless it is a student society; a letter always does.
create function private.request_organization_check(
  org uuid,
  method text,
  letter text default null,
  student_society boolean default false,
  university text default null,
  approval text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  folder text := org::text || '/';
  proved uuid;
  place text := nullif(trim(coalesce(university, '')), '');
  outcome text;
begin
  if not private.has_org_role(org, '{owner,admin}') then
    raise exception 'Only owners and admins can verify the organization' using errcode = '42501';
  end if;
  if private.organization_verified(org) then
    raise exception 'The organization is already verified' using errcode = 'check_violation';
  end if;
  if method = 'domain' then
    select d.id into proved from public.pass_partner_domains d
    where d.organization_id = org and d.verified_at is not null
    order by d.verified_at limit 1;
    if proved is null then
      raise exception 'Verify a domain in Developers first' using errcode = 'check_violation';
    end if;
  elsif method = 'letter' then
    if letter is null or letter not like folder || '%' then
      raise exception 'Add the official letter' using errcode = 'check_violation';
    end if;
  else
    raise exception 'Choose domain or letter' using errcode = 'check_violation';
  end if;
  if coalesce(student_society, false) and (
    place is null or char_length(place) > 160
    or approval is null or approval not like folder || '%'
  ) then
    raise exception 'Add the university and its approval' using errcode = 'check_violation';
  end if;

  outcome := case
    when method = 'domain' and not coalesce(student_society, false) then 'verified'
    else 'pending'
  end;

  insert into public.organization_verifications as v (
    organization_id, method, domain_id, letter, is_student_society, university, approval,
    status, requested_by, requested_at, verified_at, reject_reason, reviewed_by, reviewed_at
  )
  values (
    org, method, proved,
    case when method = 'letter' then letter end,
    coalesce(student_society, false),
    case when coalesce(student_society, false) then place end,
    case when coalesce(student_society, false) then approval end,
    outcome, (select auth.uid()), now(),
    case when outcome = 'verified' then now() end,
    null, null, null
  )
  on conflict (organization_id) do update set
    method = excluded.method,
    domain_id = excluded.domain_id,
    letter = excluded.letter,
    is_student_society = excluded.is_student_society,
    university = excluded.university,
    approval = excluded.approval,
    status = excluded.status,
    requested_by = excluded.requested_by,
    requested_at = excluded.requested_at,
    verified_at = excluded.verified_at,
    reject_reason = null,
    reviewed_by = null,
    reviewed_at = null;

  return outcome;
end;
$$;

create function public.request_organization_check(
  org uuid,
  method text,
  letter text default null,
  student_society boolean default false,
  university text default null,
  approval text default null
)
returns text
language sql
set search_path = ''
as $$ select private.request_organization_check(org, method, letter, student_society, university, approval) $$;

-- Support approves or rejects; the organization's owners and admins hear.
create function private.review_organization_check(
  org uuid,
  approve boolean,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.organization_verifications;
  admin_id uuid;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into found from public.organization_verifications v
  where v.organization_id = org and v.status = 'pending'
  for update;
  if found.organization_id is null then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;

  update public.organization_verifications set
    status = case when approve then 'verified' else 'rejected' end,
    verified_at = case when approve then now() end,
    reject_reason = case when approve then null else left(nullif(trim(reason), ''), 500) end,
    reviewed_by = (select auth.uid()),
    reviewed_at = now()
  where organization_id = org;

  for admin_id in
    select m.user_id from public.organization_members m
    where m.organization_id = org and m.role in ('owner', 'admin')
  loop
    perform private.notify(
      admin_id, 'system',
      case when approve then 'organization_verified' else 'organization_rejected' end,
      '{}'::jsonb,
      '/business/organization#verification'
    );
  end loop;
end;
$$;

create function public.review_organization_check(org uuid, approve boolean, reason text default null)
returns void
language sql
set search_path = ''
as $$ select private.review_organization_check(org, approve, reason) $$;

-- Support reads the letters and approvals under review.
create policy "Support reads organization verification documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'org-files'
    and (select private.has_staff_role('{support}'))
    and exists (
      select 1 from public.organization_verifications v
      where objects.name in (v.letter, v.approval)
    )
  );

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.shop_month_sales(uuid) from public, anon, authenticated;
revoke all on function private.check_shop_limit() from public, anon, authenticated;
revoke all on function private.organization_verified(uuid) from public, anon, authenticated;
revoke all on function private.apply_to_sell(uuid, text, public.shop_kind) from public, anon;
revoke all on function public.apply_to_sell(uuid, text, public.shop_kind) from public, anon;
revoke all on function private.set_shop_kind(uuid, public.shop_kind) from public, anon;
revoke all on function public.set_shop_kind(uuid, public.shop_kind) from public, anon;
revoke all on function private.shop_limit(uuid) from public, anon;
revoke all on function public.shop_limit(uuid) from public, anon;
revoke all on function private.request_organization_check(uuid, text, text, boolean, text, text) from public, anon;
revoke all on function public.request_organization_check(uuid, text, text, boolean, text, text) from public, anon;
revoke all on function private.review_organization_check(uuid, boolean, text) from public, anon;
revoke all on function public.review_organization_check(uuid, boolean, text) from public, anon;

grant execute on function private.apply_to_sell(uuid, text, public.shop_kind) to authenticated;
grant execute on function public.apply_to_sell(uuid, text, public.shop_kind) to authenticated;
grant execute on function private.set_shop_kind(uuid, public.shop_kind) to authenticated;
grant execute on function public.set_shop_kind(uuid, public.shop_kind) to authenticated;
grant execute on function private.shop_limit(uuid) to authenticated;
grant execute on function public.shop_limit(uuid) to authenticated;
grant execute on function private.request_organization_check(uuid, text, text, boolean, text, text) to authenticated;
grant execute on function public.request_organization_check(uuid, text, text, boolean, text, text) to authenticated;
grant execute on function private.review_organization_check(uuid, boolean, text) to authenticated;
grant execute on function public.review_organization_check(uuid, boolean, text) to authenticated;
