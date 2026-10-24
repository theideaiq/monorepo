-- Sell to us: customers offer The IDEA an item (vinyl, CDs and cassettes,
-- games, books, consoles and tech) for cash or store credit.
--
-- trade_ins: one row per request, owned by the customer who sent it, with
-- up to six photos in the private `trade-ins` bucket under "<user id>/…".
--
--   submitted → reviewing → offer_made → accepted → completed
--                    ↘           ↘ declined ↗ (a new offer)   ↘
--                     rejected      (any open state) → withdrawn
--
-- Customers insert their own requests and read them; they change a request
-- only through respond_to_trade_in_offer() (accept or decline the offer)
-- and withdraw_trade_in(). Support staff (and admins) read every request,
-- move it along, make the offer (offer_amount + offer_note, which the
-- customer sees) and complete it with complete_trade_in(), which can also
-- create a draft product prefilled from the request (admins publish it in
-- the catalog). A new offer notifies the customer (notifications, so push
-- and WhatsApp follow).

create type public.trade_in_category as enum (
  'vinyl', 'cd_cassette', 'game', 'book', 'console_tech', 'other'
);
create type public.trade_in_condition as enum (
  'sealed', 'like_new', 'good', 'fair', 'poor'
);
create type public.trade_in_payout as enum ('cash', 'store_credit');
create type public.trade_in_status as enum (
  'submitted', 'reviewing', 'offer_made', 'accepted', 'declined',
  'completed', 'rejected', 'withdrawn'
);

alter type public.notification_kind add value if not exists 'trade_in';

-- True when every path is inside `folder` ("<folder>/…").
create function private.paths_in_folder(paths text[], folder text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(split_part(item.p, '/', 1) = folder and item.p not like '%..%'), true)
  from unnest(paths) as item (p);
$$;

revoke all on function private.paths_in_folder(text[], text) from public, anon;
grant execute on function private.paths_in_folder(text[], text) to authenticated, service_role;

create table public.trade_ins (
  id uuid primary key default gen_random_uuid(),
  -- Short number for the customer and staff ("#5001").
  number bigint generated always as identity (start with 5001) unique,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  category public.trade_in_category not null,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 4000),
  condition public.trade_in_condition not null,
  -- What the customer hopes for, in IQD (optional).
  asking_price bigint check (asking_price is null or asking_price >= 0),
  payout public.trade_in_payout not null default 'cash',
  -- Storage paths in the private `trade-ins` bucket, "<user id>/…".
  photos text[] not null default '{}'
    check (cardinality(photos) <= 6 and private.paths_in_folder(photos, user_id::text)),
  -- Iraqi mobile number in E.164 (+9647…), for staff to call back.
  contact_phone text not null check (contact_phone ~ '^\+9647[0-9]{9}$'),
  status public.trade_in_status not null default 'submitted',
  -- The offer in IQD and a note the customer sees (also the reason for a
  -- rejection).
  offer_amount bigint check (offer_amount is null or offer_amount >= 0),
  offer_note text check (char_length(offer_note) <= 2000),
  offered_at timestamptz,
  responded_at timestamptz,
  closed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  -- The draft product created on completion, if any.
  product_id uuid references public.products (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('offer_made', 'accepted', 'declined', 'completed') or offer_amount is not null)
);

create index trade_ins_user_id_idx on public.trade_ins (user_id, created_at desc);
create index trade_ins_queue_idx on public.trade_ins (status, created_at);
create index trade_ins_reviewed_by_idx on public.trade_ins (reviewed_by);
create index trade_ins_product_id_idx on public.trade_ins (product_id);

create trigger set_updated_at before update on public.trade_ins
  for each row execute function private.set_updated_at();

-- ── Triggers ────────────────────────────────────────────────────────────────

-- New requests: not from suspended accounts, at most 10 open at a time.
create function private.on_trade_in_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles where id = new.user_id and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  if (
    select count(*) from public.trade_ins
    where user_id = new.user_id
      and status in ('submitted', 'reviewing', 'offer_made', 'accepted', 'declined')
  ) >= 10 then
    raise exception 'Too many open trade-in requests' using errcode = 'check_violation';
  end if;

  new.status := 'submitted';
  return new;
end;
$$;

create trigger on_trade_in_insert before insert on public.trade_ins
  for each row execute function private.on_trade_in_insert();

-- Staff changes made directly (the back office): only the moves staff may
-- make, and the offer only changes while an offer is being made. The
-- customer's choices (accepted, declined, withdrawn) go through the RPCs
-- below, which run as the owner and are checked there. Keeps the dates.
create function private.guard_trade_in()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    if new.status is distinct from old.status and not (
      (old.status = 'submitted' and new.status in ('reviewing', 'offer_made', 'rejected'))
      or (old.status = 'reviewing' and new.status in ('offer_made', 'rejected'))
      or (old.status = 'offer_made' and new.status in ('reviewing', 'rejected'))
      or (old.status = 'declined' and new.status in ('offer_made', 'rejected'))
      or (old.status = 'accepted' and new.status in ('completed', 'rejected'))
    ) then
      raise exception 'Trade-in can''t change from % to %', old.status, new.status
        using errcode = 'check_violation';
    end if;

    if new.offer_amount is distinct from old.offer_amount and new.status <> 'offer_made' then
      raise exception 'Trade-in offer can''t change from % to %', old.status, new.status
        using errcode = 'check_violation';
    end if;

    new.reviewed_by := (select auth.uid());
  end if;

  if new.status = 'offer_made'
    and (old.status <> 'offer_made' or new.offer_amount is distinct from old.offer_amount)
  then
    new.offered_at := now();
  end if;

  if new.status in ('accepted', 'declined') and new.status is distinct from old.status then
    new.responded_at := now();
  end if;

  if new.status in ('completed', 'rejected', 'withdrawn') and new.status is distinct from old.status then
    new.closed_at := now();
  end if;

  return new;
end;
$$;

create trigger guard_trade_in before update on public.trade_ins
  for each row execute function private.guard_trade_in();

-- The customer hears about a new (or revised) offer, a rejection and the
-- completed trade.
create function private.notify_trade_in()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  details jsonb := jsonb_build_object('number', new.number, 'title', new.title);
begin
  if new.status = 'offer_made'
    and (old.status <> 'offer_made' or new.offer_amount is distinct from old.offer_amount)
  then
    perform private.notify(
      new.user_id, 'trade_in', 'trade_in_offer',
      details || jsonb_build_object('amount', new.offer_amount, 'payout', new.payout),
      '/sell'
    );
  elsif new.status is distinct from old.status and new.status in ('rejected', 'completed') then
    perform private.notify(new.user_id, 'trade_in', 'trade_in_' || new.status::text, details, '/sell');
  end if;
  return null;
end;
$$;

create trigger notify_trade_in after update of status, offer_amount on public.trade_ins
  for each row execute function private.notify_trade_in();

create trigger audit_trade_ins after update on public.trade_ins
  for each row execute function private.audit_change();

-- ── RPCs (bodies in private, invoker wrappers in public) ───────────────────

-- The customer accepts or declines the offer on their request.
create function private.respond_to_trade_in_offer(trade_in uuid, accept boolean)
returns public.trade_in_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.trade_in_status;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  update public.trade_ins
  set status = case when accept then 'accepted'::public.trade_in_status else 'declined'::public.trade_in_status end
  where id = trade_in and user_id = (select auth.uid()) and status = 'offer_made'
  returning status into result;

  if result is null then
    raise exception 'No open offer on this request' using errcode = 'no_data_found';
  end if;
  return result;
end;
$$;

create function public.respond_to_trade_in_offer(trade_in uuid, accept boolean)
returns public.trade_in_status
language sql volatile
security invoker
set search_path = ''
as $$ select private.respond_to_trade_in_offer($1, $2) $$;

-- The customer withdraws a request that isn't settled yet.
create function private.withdraw_trade_in(trade_in uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  update public.trade_ins set status = 'withdrawn'
  where id = trade_in
    and user_id = (select auth.uid())
    and status in ('submitted', 'reviewing', 'offer_made', 'declined');

  if not found then
    raise exception 'Request not found or already settled' using errcode = 'no_data_found';
  end if;
end;
$$;

create function public.withdraw_trade_in(trade_in uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.withdraw_trade_in($1) $$;

-- Support completes an accepted trade (the item was received and paid
-- for). With create_product, a draft product prefilled from the request is
-- added to the catalog for an admin to price, illustrate and publish.
-- Returns the product id (null without one).
create function private.complete_trade_in(trade_in uuid, create_product boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.trade_ins;
  created uuid;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Only support completes trade-ins' using errcode = 'insufficient_privilege';
  end if;

  select * into request from public.trade_ins where id = trade_in for update;
  if not found then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;
  if request.status <> 'accepted' then
    raise exception 'Trade-in can''t change from % to completed', request.status
      using errcode = 'check_violation';
  end if;

  if create_product then
    insert into public.products (
      slug, kind, status, name_ar, name_en, description_ar, description_en,
      price, condition, stock_count
    )
    values (
      'trade-in-' || request.number,
      'sale',
      'draft',
      request.title,
      request.title,
      request.description,
      request.description,
      0,
      case request.condition
        when 'sealed' then 'new'::public.product_condition
        when 'like_new' then 'open_box'::public.product_condition
        else 'used'::public.product_condition
      end,
      1
    )
    returning id into created;
  end if;

  update public.trade_ins
  set status = 'completed',
      product_id = coalesce(created, product_id),
      reviewed_by = (select auth.uid())
  where id = request.id;

  return created;
end;
$$;

create function public.complete_trade_in(trade_in uuid, create_product boolean default false)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.complete_trade_in($1, $2) $$;

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.trade_ins enable row level security;

create policy "Customers see their trade-ins; support sees all"
  on public.trade_ins for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

create policy "Customers send their own trade-ins"
  on public.trade_ins for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Support reviews trade-ins"
  on public.trade_ins for update to authenticated
  using ((select private.has_staff_role('{support}')))
  with check ((select private.has_staff_role('{support}')));

revoke all on public.trade_ins from anon, authenticated;
grant select on public.trade_ins to authenticated;
grant insert (user_id, category, title, description, condition, asking_price, payout, photos, contact_phone)
  on public.trade_ins to authenticated;
grant update (status, offer_amount, offer_note) on public.trade_ins to authenticated;
grant all on public.trade_ins to service_role;

revoke all on function private.on_trade_in_insert() from public, anon, authenticated;
revoke all on function private.guard_trade_in() from public, anon, authenticated;
revoke all on function private.notify_trade_in() from public, anon, authenticated;

revoke all on function private.respond_to_trade_in_offer(uuid, boolean) from public, anon;
revoke all on function private.withdraw_trade_in(uuid) from public, anon;
revoke all on function private.complete_trade_in(uuid, boolean) from public, anon;
grant execute on function private.respond_to_trade_in_offer(uuid, boolean) to authenticated, service_role;
grant execute on function private.withdraw_trade_in(uuid) to authenticated, service_role;
grant execute on function private.complete_trade_in(uuid, boolean) to authenticated, service_role;

revoke all on function public.respond_to_trade_in_offer(uuid, boolean) from public, anon;
revoke all on function public.withdraw_trade_in(uuid) from public, anon;
revoke all on function public.complete_trade_in(uuid, boolean) from public, anon;
grant execute on function public.respond_to_trade_in_offer(uuid, boolean) to authenticated, service_role;
grant execute on function public.withdraw_trade_in(uuid) to authenticated, service_role;
grant execute on function public.complete_trade_in(uuid, boolean) to authenticated, service_role;

-- ── Storage: trade-in photos ────────────────────────────────────────────────
-- Private bucket, "<user id>/…": the customer uploads and reads their own
-- photos and may delete one no request uses (a failed submission); support
-- reads every photo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trade-ins', 'trade-ins', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Customers upload their trade-in photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trade-ins'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Customers and support read trade-in photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'trade-ins'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.has_staff_role('{support}'))
    )
  );

create policy "Customers delete unused trade-in photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'trade-ins'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.trade_ins t
      where t.user_id = (select auth.uid()) and objects.name = any (t.photos)
    )
  );
