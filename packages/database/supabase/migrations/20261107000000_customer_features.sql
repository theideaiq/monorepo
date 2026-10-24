-- Customer features carried over from the old apps, rebuilt on the new
-- schema: wishlists, product reviews, support tickets, in-app notifications,
-- rental tiers, seller details on products and the CRM's last contact date.

-- ── Products: seller, verification and rental tiers ─────────────────────────

alter table public.products
  add column seller text not null default 'The IDEA' check (char_length(seller) between 1 and 120),
  add column verified boolean not null default true,
  -- Rental items can require a higher IDEA Plus plan (plans.tier); null = any.
  add column rental_tier smallint check (rental_tier between 1 and 10);

alter table public.plans
  add column tier smallint check (tier between 1 and 10),
  add constraint plans_plus_tier check (audience <> 'plus' or tier is not null);

-- Highest plan tier of the member's live Plus membership (0 without one).
create function private.plus_tier(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(p.tier), 0)
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = member
    and s.status in ('active', 'past_due')
    and p.audience = 'plus'
    and (s.current_period_end is null or s.current_period_end > now());
$$;

revoke all on function private.plus_tier(uuid) from public, anon, authenticated;
grant execute on function private.plus_tier(uuid) to service_role;

create or replace function public.request_rental(rental_product uuid)
returns public.rentals
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  item public.products;
  open_rentals integer;
  created public.rentals;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  select * into item from public.products
  where id = rental_product and kind = 'rental' and status = 'active'
  for update;

  if not found then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;

  select count(*) into open_rentals from public.rentals
  where user_id = caller and status in ('requested', 'active', 'overdue');

  if open_rentals >= private.plus_rental_slots(caller) then
    raise exception 'No free rental slots' using errcode = 'check_violation';
  end if;

  if item.rental_tier is not null and private.plus_tier(caller) < item.rental_tier then
    raise exception 'This item needs a higher plan' using errcode = 'check_violation';
  end if;

  if item.stock_count < 1 then
    raise exception 'All copies are rented out' using errcode = 'check_violation';
  end if;

  update public.products set stock_count = stock_count - 1 where id = item.id;

  insert into public.rentals (user_id, product_id, name_ar, name_en)
  values (caller, item.id, item.name_ar, item.name_en)
  returning * into created;

  return created;
end;
$$;

-- The caller's rental allowance, now with their plan tier.
drop function public.my_rental_allowance();

create function public.my_rental_allowance()
returns table (slots integer, in_use integer, tier integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.plus_rental_slots((select auth.uid())),
    (
      select count(*)::integer from public.rentals
      where user_id = (select auth.uid()) and status in ('requested', 'active', 'overdue')
    ),
    private.plus_tier((select auth.uid()));
$$;

revoke all on function public.my_rental_allowance() from public, anon;
grant execute on function public.my_rental_allowance() to authenticated;

-- ── CRM ─────────────────────────────────────────────────────────────────────

alter table public.crm_contacts add column last_contacted_at timestamptz;

-- ── Wishlists ───────────────────────────────────────────────────────────────

create table public.wishlist_items (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index wishlist_items_product_id_idx on public.wishlist_items (product_id);

alter table public.wishlist_items enable row level security;

create policy "Users see their wishlist"
  on public.wishlist_items for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users add to their wishlist"
  on public.wishlist_items for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users remove from their wishlist"
  on public.wishlist_items for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── Product reviews ─────────────────────────────────────────────────────────

create type public.review_status as enum ('published', 'hidden');

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  -- Set by the database: the author bought (or rented) the product.
  verified_purchase boolean not null default false,
  status public.review_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index product_reviews_product_idx on public.product_reviews (product_id, created_at desc)
  where status = 'published';

create function private.on_review_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.profiles where id = new.user_id and banned_at is not null) then
      raise exception 'Account suspended' using errcode = 'insufficient_privilege';
    end if;
  end if;

  new.verified_purchase := exists (
    select 1
    from public.order_items i
    join public.orders o on o.id = i.order_id
    where i.product_id = new.product_id
      and o.user_id = new.user_id
      and o.status in ('paid', 'processing', 'shipped', 'delivered')
  ) or exists (
    select 1 from public.rentals r
    where r.product_id = new.product_id
      and r.user_id = new.user_id
      and r.status in ('active', 'overdue', 'returned')
  );

  return new;
end;
$$;

create trigger on_review_write before insert or update of rating, comment on public.product_reviews
  for each row execute function private.on_review_write();

create trigger set_updated_at before update on public.product_reviews
  for each row execute function private.set_updated_at();

-- Average rating and count of published reviews, per product.
create view public.product_ratings
with (security_invoker = true)
as
select
  product_id,
  round(avg(rating), 1)::numeric(2, 1) as average,
  count(*)::integer as count
from public.product_reviews
where status = 'published'
group by product_id;

-- Reviewer names for published reviews, without exposing other profile data.
create function public.product_review_list(review_product uuid, max_rows integer default 20, skip integer default 0)
returns table (
  id uuid,
  rating smallint,
  comment text,
  verified_purchase boolean,
  created_at timestamptz,
  author_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rating, r.comment, r.verified_purchase, r.created_at,
    nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), '')
  from public.product_reviews r
  left join public.profiles p on p.id = r.user_id
  where r.product_id = review_product and r.status = 'published'
  order by r.created_at desc
  limit least(greatest(max_rows, 1), 50) offset greatest(skip, 0);
$$;

alter table public.product_reviews enable row level security;

create policy "Published reviews are public; authors and support see theirs"
  on public.product_reviews for select to anon, authenticated
  using (
    status = 'published'
    or user_id = (select auth.uid())
    or private.has_staff_role('{support}')
  );

create policy "Customers review once per product"
  on public.product_reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'published');

create policy "Authors edit their review; support moderates"
  on public.product_reviews for update to authenticated
  using (user_id = (select auth.uid()) or private.has_staff_role('{support}'))
  with check (user_id = (select auth.uid()) or private.has_staff_role('{support}'));

create policy "Authors and support delete reviews"
  on public.product_reviews for delete to authenticated
  using (user_id = (select auth.uid()) or private.has_staff_role('{support}'));

-- Authors may not hide or unhide their own review.
create function private.guard_review_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and current_user = 'authenticated'
    and not private.has_staff_role('{support}')
  then
    raise exception 'Only staff moderate reviews' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger guard_review_status before update of status on public.product_reviews
  for each row execute function private.guard_review_status();

create trigger audit_product_reviews after update of status or delete on public.product_reviews
  for each row execute function private.audit_change();

-- ── Support tickets ─────────────────────────────────────────────────────────

create type public.ticket_status as enum ('open', 'pending', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'normal', 'high', 'urgent');
create type public.ticket_topic as enum ('order', 'rental', 'plus', 'account', 'other');

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  user_id uuid references auth.users (id) on delete cascade default auth.uid(),
  subject text not null check (char_length(subject) between 1 and 200),
  topic public.ticket_topic not null default 'other',
  -- open: waiting on staff · pending: waiting on the customer
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'normal',
  order_id uuid references public.orders (id) on delete set null,
  assigned_to uuid references auth.users (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_user_idx on public.support_tickets (user_id, last_message_at desc);
create index support_tickets_queue_idx on public.support_tickets (status, last_message_at)
  where status in ('open', 'pending');

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null default auth.uid(),
  body text not null check (char_length(body) between 1 and 5000),
  -- Staff-only notes, never shown to the customer.
  internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

create trigger set_updated_at before update on public.support_tickets
  for each row execute function private.set_updated_at();

-- A new message moves the ticket: a customer reply reopens it, a staff
-- reply waits on the customer. Closed tickets take no customer replies.
create function private.on_support_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets;
begin
  select * into ticket from public.support_tickets where id = new.ticket_id for update;

  if new.author_id is not distinct from ticket.user_id then
    if ticket.status = 'closed' then
      raise exception 'This ticket is closed' using errcode = 'check_violation';
    end if;
    update public.support_tickets
    set status = 'open', last_message_at = new.created_at
    where id = ticket.id;
  elsif not new.internal then
    update public.support_tickets
    set status = case when status in ('open', 'resolved') then 'pending'::public.ticket_status else status end,
        last_message_at = new.created_at
    where id = ticket.id;
  end if;

  return new;
end;
$$;

create trigger on_support_message after insert on public.support_messages
  for each row execute function private.on_support_message();

-- Opens a ticket with its first message in one step.
create function public.create_support_ticket(
  ticket_subject text,
  ticket_body text,
  ticket_topic public.ticket_topic default 'other',
  ticket_order uuid default null
)
returns public.support_tickets
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  created public.support_tickets;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if ticket_order is not null
    and not exists (select 1 from public.orders where id = ticket_order and user_id = caller)
  then
    raise exception 'Order not found' using errcode = 'no_data_found';
  end if;

  insert into public.support_tickets (user_id, subject, topic, order_id)
  values (caller, ticket_subject, ticket_topic, ticket_order)
  returning * into created;

  insert into public.support_messages (ticket_id, author_id, body)
  values (created.id, caller, ticket_body);

  select * into created from public.support_tickets where id = created.id;
  return created;
end;
$$;

-- Customers close their own tickets.
create function public.close_support_ticket(ticket uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.support_tickets set status = 'closed'
  where id = ticket and user_id = (select auth.uid()) and status <> 'closed';

  if not found then
    raise exception 'Ticket not found or already closed' using errcode = 'no_data_found';
  end if;
end;
$$;

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

create policy "Customers see their tickets; support sees all"
  on public.support_tickets for select to authenticated
  using (user_id = (select auth.uid()) or private.has_staff_role('{support}'));

create policy "Support manages tickets"
  on public.support_tickets for update to authenticated
  using (private.has_staff_role('{support}'))
  with check (private.has_staff_role('{support}'));

create policy "Customers see public messages on their tickets; support sees all"
  on public.support_messages for select to authenticated
  using (
    private.has_staff_role('{support}')
    or (
      not internal
      and exists (
        select 1 from public.support_tickets t
        where t.id = ticket_id and t.user_id = (select auth.uid())
      )
    )
  );

create policy "Customers reply on their tickets; support replies anywhere"
  on public.support_messages for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      private.has_staff_role('{support}')
      or (
        not internal
        and exists (
          select 1 from public.support_tickets t
          where t.id = ticket_id and t.user_id = (select auth.uid())
        )
      )
    )
  );

create trigger audit_support_tickets after update on public.support_tickets
  for each row execute function private.audit_change();

-- ── Notifications ───────────────────────────────────────────────────────────
-- Written by triggers (and server code); the app renders `event` + `data`
-- through its translations, so a notification reads in the viewer's language.

create type public.notification_kind as enum ('order', 'rental', 'support', 'plus', 'promo', 'system');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.notification_kind not null,
  -- e.g. order_shipped, rental_overdue, support_reply
  event text not null check (event ~ '^[a-z][a-z0-9_]{0,63}$'),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  -- App path to open, e.g. /orders/view?id=…
  link text check (char_length(link) <= 500 and link like '/%'),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create function private.notify(
  recipient uuid,
  notification_kind public.notification_kind,
  notification_event text,
  notification_data jsonb default '{}'::jsonb,
  notification_link text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, event, data, link)
  select recipient, notification_kind, notification_event, notification_data, notification_link
  where recipient is not null;
$$;

create function private.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status <> 'pending' then
    perform private.notify(
      new.user_id,
      'order',
      'order_' || new.status::text,
      jsonb_build_object('number', new.number, 'tracking', new.tracking_number),
      '/orders/view?id=' || new.id
    );
  end if;
  return null;
end;
$$;

create trigger notify_order_status after update of status on public.orders
  for each row execute function private.notify_order_status();

create function private.notify_rental_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status <> 'requested' then
    perform private.notify(
      new.user_id,
      'rental',
      'rental_' || new.status::text,
      jsonb_build_object(
        'name_ar', new.name_ar,
        'name_en', new.name_en,
        'due_at', new.due_at
      ),
      '/plus'
    );
  end if;
  return null;
end;
$$;

create trigger notify_rental_status after update of status on public.rentals
  for each row execute function private.notify_rental_status();

create function private.notify_support_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket public.support_tickets;
begin
  select * into ticket from public.support_tickets where id = new.ticket_id;
  if not new.internal and new.author_id is distinct from ticket.user_id then
    perform private.notify(
      ticket.user_id,
      'support',
      'support_reply',
      jsonb_build_object('number', ticket.number, 'subject', ticket.subject),
      '/support/view?id=' || ticket.id
    );
  end if;
  return null;
end;
$$;

create trigger notify_support_reply after insert on public.support_messages
  for each row execute function private.notify_support_reply();

-- Marks some (or all) of the caller's notifications as read.
create function public.mark_notifications_read(notification_ids uuid[] default null)
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.notifications set read_at = now()
    where user_id = (select auth.uid())
      and read_at is null
      and (notification_ids is null or id = any (notification_ids))
    returning 1
  )
  select count(*)::integer from updated;
$$;

alter table public.notifications enable row level security;

create policy "Users see their notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users delete their notifications"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── Privileges ──────────────────────────────────────────────────────────────

revoke all on public.wishlist_items, public.product_reviews, public.product_ratings,
  public.support_tickets, public.support_messages, public.notifications
  from anon, authenticated;

grant select, delete on public.wishlist_items to authenticated;
grant insert (product_id, user_id) on public.wishlist_items to authenticated;

grant select on public.product_reviews, public.product_ratings to anon, authenticated;
grant insert (product_id, user_id, rating, comment) on public.product_reviews to authenticated;
grant update (rating, comment, status) on public.product_reviews to authenticated;
grant delete on public.product_reviews to authenticated;

grant select on public.support_tickets, public.support_messages to authenticated;
grant update (status, priority, assigned_to) on public.support_tickets to authenticated;
grant insert (ticket_id, author_id, body, internal) on public.support_messages to authenticated;

grant select, delete on public.notifications to authenticated;

grant update (seller, verified, rental_tier) on public.products to authenticated;
grant update (tier) on public.plans to authenticated;
grant update (last_contacted_at) on public.crm_contacts to authenticated;

grant all on public.wishlist_items, public.product_reviews, public.support_tickets,
  public.support_messages, public.notifications to service_role;
grant select on public.product_ratings to service_role;

revoke all on function private.on_review_write() from public, anon, authenticated;
revoke all on function private.guard_review_status() from public, anon, authenticated;
revoke all on function private.on_support_message() from public, anon, authenticated;
revoke all on function private.notify(uuid, public.notification_kind, text, jsonb, text) from public, anon, authenticated;
revoke all on function private.notify_order_status() from public, anon, authenticated;
revoke all on function private.notify_rental_status() from public, anon, authenticated;
revoke all on function private.notify_support_reply() from public, anon, authenticated;
grant execute on function private.notify(uuid, public.notification_kind, text, jsonb, text) to service_role;

revoke all on function public.product_review_list(uuid, integer, integer) from public;
revoke all on function public.create_support_ticket(text, text, public.ticket_topic, uuid) from public, anon;
revoke all on function public.close_support_ticket(uuid) from public, anon;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.product_review_list(uuid, integer, integer) to anon, authenticated;
grant execute on function public.create_support_ticket(text, text, public.ticket_topic, uuid) to authenticated;
grant execute on function public.close_support_ticket(uuid) to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
