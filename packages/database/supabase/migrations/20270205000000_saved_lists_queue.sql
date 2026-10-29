-- Saved, lists and the Plus queue (owner's master brief, step 8, section 12).
--
-- * Saved is what a member watches. Each saved item (`wishlist_items`)
--   now has a "Tell me" toggle (`notify`, on by default), an optional
--   price target, the price it had when saved (for "Price dropped") and
--   the list it belongs to, if any.
-- * Lists (`saved_lists`) are named groups of saved items, private or
--   shared by link (`shared_list(token)`).
-- * The Plus queue is its own table (`rental_queue_items`), in order;
--   until now it was the rentable items of the wishlist. Each Plus
--   member's rentable saved items are copied into it, in order.
-- * Watched changes go to the bell: the first copy in stock ("Back in
--   stock", or "Out now" for a new release) and a lower price (below the
--   target, when one is set). "Notify me" requests (`product_alerts`) are
--   copied into Saved; the table stays until the website stops using it.
-- * `products.release_date` (optional) tells "Coming soon" from "Out now".

alter table public.products add column release_date date;

comment on column public.products.release_date is
  'When the title comes out, if known: Saved shows "Coming soon" before it and "Out now" for 14 days after.';

-- ── Lists ──────────────────────────────────────────────────────────────────

create table public.saved_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  shared boolean not null default false,
  share_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.saved_lists is
  'A member''s named lists of saved items, private or shared by link.';

create index saved_lists_user_idx on public.saved_lists (user_id, created_at);

create trigger set_updated_at before update on public.saved_lists
  for each row execute function private.set_updated_at();

alter table public.saved_lists enable row level security;

create policy "Members see their lists" on public.saved_lists
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Members add lists" on public.saved_lists
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Members change their lists" on public.saved_lists
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Members delete their lists" on public.saved_lists
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.saved_lists to authenticated;
grant update (name, shared) on public.saved_lists to authenticated;

-- ── Saved items ────────────────────────────────────────────────────────────

alter table public.wishlist_items
  add column list_id uuid references public.saved_lists (id) on delete set null,
  add column notify boolean not null default true,
  add column price_target bigint check (price_target > 0),
  add column saved_price bigint,
  add column alerted_price bigint;

comment on column public.wishlist_items.notify is '"Tell me": watched changes go to the bell.';
comment on column public.wishlist_items.price_target is 'Tell me only below this price (IQD).';
comment on column public.wishlist_items.saved_price is 'The product''s price when saved, for "Price dropped".';
comment on column public.wishlist_items.alerted_price is 'The price last told, so a drop is told once.';

create index wishlist_items_list_idx on public.wishlist_items (list_id) where list_id is not null;
create index wishlist_items_product_idx on public.wishlist_items (product_id) where notify;

update public.wishlist_items w set saved_price = p.price
from public.products p where p.id = w.product_id;

-- A saved item's list is the member's own; its saved price is today's.
create function private.saved_item_checks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.list_id is not null and not exists (
    select 1 from public.saved_lists l where l.id = new.list_id and l.user_id = new.user_id
  ) then
    raise exception 'Not your list' using errcode = 'insufficient_privilege';
  end if;
  if tg_op = 'INSERT' then
    new.saved_price := (select p.price from public.products p where p.id = new.product_id);
    new.alerted_price := null;
  end if;
  return new;
end;
$$;

revoke all on function private.saved_item_checks() from public, anon, authenticated;

create trigger saved_item_checks before insert or update of list_id on public.wishlist_items
  for each row execute function private.saved_item_checks();

create policy "Members change their saved items" on public.wishlist_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant update (list_id, notify, price_target) on public.wishlist_items to authenticated;

-- "Notify me" requests become saved items that tell.
insert into public.wishlist_items (user_id, product_id, notify)
select a.user_id, a.product_id, true from public.product_alerts a
on conflict (user_id, product_id) do update set notify = true;

-- A shared list as a friend sees it: its name, the owner's first name and
-- its products (never the owner's address or anything else).
create function private.shared_list(token text)
returns table (list_name text, owner_name text, product_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select l.name, split_part(coalesce(pr.full_name, ''), ' ', 1), w.product_id
  from public.saved_lists l
  left join public.profiles pr on pr.id = l.user_id
  left join public.wishlist_items w on w.list_id = l.id
  where l.share_token = token and l.shared
  order by w.position;
$$;

create function public.shared_list(token text)
returns table (list_name text, owner_name text, product_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.shared_list(token) $$;

revoke all on function private.shared_list(text) from public;
revoke all on function public.shared_list(text) from public;
grant execute on function private.shared_list(text) to anon, authenticated;
grant execute on function public.shared_list(text) to anon, authenticated;

-- ── The Plus queue ─────────────────────────────────────────────────────────

create table public.rental_queue_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  position integer not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

comment on table public.rental_queue_items is
  'A Plus member''s queue: what to rent next, in order. Swaps take from the top. Written by functions.';

create index rental_queue_items_product_idx on public.rental_queue_items (product_id);

alter table public.rental_queue_items enable row level security;

create policy "Members see their queue" on public.rental_queue_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Members take items off their queue" on public.rental_queue_items
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, delete on public.rental_queue_items to authenticated;

-- Adds a rentable product to the end of the caller's queue (Plus members).
create function private.queue_add(product uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null or (private.member_plan(caller)).id is null then
    raise exception 'The queue is for Plus members' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.products p where p.id = product and p.rentable and p.status = 'active') then
    raise exception 'Not rentable' using errcode = 'check_violation';
  end if;
  insert into public.rental_queue_items (user_id, product_id, position)
  values (
    caller, product,
    coalesce((select max(q.position) from public.rental_queue_items q where q.user_id = caller), 0) + 1
  )
  on conflict (user_id, product_id) do nothing;
end;
$$;

-- Puts the caller's queue in the given order.
create function private.reorder_queue(products uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.rental_queue_items q
  set position = o.position
  from unnest(products) with ordinality as o (product_id, position)
  where q.user_id = (select auth.uid()) and q.product_id = o.product_id;
$$;

create function public.queue_add(product uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.queue_add(product) $$;

create function public.reorder_queue(products uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$ select private.reorder_queue(products) $$;

revoke all on function private.queue_add(uuid) from public, anon;
revoke all on function public.queue_add(uuid) from public, anon;
grant execute on function private.queue_add(uuid) to authenticated;
grant execute on function public.queue_add(uuid) to authenticated;
revoke all on function private.reorder_queue(uuid[]) from public, anon;
revoke all on function public.reorder_queue(uuid[]) from public, anon;
grant execute on function private.reorder_queue(uuid[]) to authenticated;
grant execute on function public.reorder_queue(uuid[]) to authenticated;

-- Each Plus member's queue starts as their rentable saved items, in order.
insert into public.rental_queue_items (user_id, product_id, position)
select w.user_id, w.product_id,
  row_number() over (partition by w.user_id order by w.position, w.created_at)
from public.wishlist_items w
join public.products p on p.id = w.product_id
where p.rentable and (private.member_plan(w.user_id)).id is not null;

-- ── Telling members ────────────────────────────────────────────────────────

-- A copy for sale arrives: "Notify me" requests are told as before, and
-- members who saved the product with "Tell me" on are told when it is the
-- first copy in stock ("Out now" within 14 days of its release).
create or replace function private.notify_product_alerts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.products;
  first_copy boolean;
  alerted uuid[];
begin
  if new.status <> 'available' or new.purpose <> 'sale' then
    return new;
  end if;
  select * into item from public.products p where p.id = new.product_id;
  if item.status <> 'active' then
    return new;
  end if;
  first_copy := not exists (
    select 1 from public.stock_items s
    where s.product_id = new.product_id and s.purpose = 'sale' and s.status = 'available'
      and s.id <> new.id
  );

  with told as (
    delete from public.product_alerts a where a.product_id = new.product_id
    returning a.user_id
  ), sent as (
    insert into public.notifications (user_id, kind, event, data, link)
    select told.user_id, 'system', 'product_available',
      jsonb_build_object('product_id', item.id, 'name_en', item.name_en, 'name_ar', item.name_ar),
      '/store/' || item.slug
    from told
    returning user_id
  )
  select coalesce(array_agg(sent.user_id), '{}') into alerted from sent;

  if first_copy then
    insert into public.notifications (user_id, kind, event, data, link)
    select w.user_id, 'system',
      case when item.release_date between private.baghdad_today() - 14 and private.baghdad_today()
        then 'saved_out_now' else 'saved_back_in_stock' end,
      jsonb_build_object('product_id', item.id, 'name_en', item.name_en, 'name_ar', item.name_ar),
      '/store/' || item.slug
    from public.wishlist_items w
    where w.product_id = item.id and w.notify and w.user_id <> all (alerted);
  end if;
  return new;
end;
$$;

-- A listing's price changes: members who saved the product with "Tell me"
-- on hear of a lower price than they last knew (under their target, if
-- they set one), once per drop.
create function private.notify_saved_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.products;
  lowest bigint;
begin
  if new.ended_at is not null then
    return new;
  end if;
  select p.* into item from public.products p
  join public.product_variants v on v.product_id = p.id
  where v.id = new.variant_id;
  if item.id is null or item.status <> 'active' then
    return new;
  end if;
  select min(h.price) into lowest
  from public.price_history h
  join public.product_variants v on v.id = h.variant_id
  where v.product_id = item.id and h.ended_at is null;

  with told as (
    update public.wishlist_items w set alerted_price = lowest
    where w.product_id = item.id and w.notify
      and lowest < coalesce(w.alerted_price, w.saved_price, lowest + 1)
      and (w.price_target is null or lowest <= w.price_target)
    returning w.user_id
  )
  insert into public.notifications (user_id, kind, event, data, link)
  select told.user_id, 'system', 'saved_price_drop',
    jsonb_build_object('product_id', item.id, 'name_en', item.name_en, 'name_ar', item.name_ar, 'price', lowest),
    '/store/' || item.slug
  from told;
  return new;
end;
$$;

revoke all on function private.notify_saved_price() from public, anon, authenticated;

create trigger notify_saved_price after insert on public.price_history
  for each row execute function private.notify_saved_price();
