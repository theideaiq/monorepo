-- Review requests and cart reminders (brief section 24).
--
-- * Review request: 3 days after an order is delivered, the member is
--   asked (notification and email) to review what they bought and haven't
--   reviewed yet. Once per order (`orders.review_requested_at`); orders
--   delivered more than 10 days ago are never asked (so the first run
--   doesn't reach old orders). Gifts aren't asked.
-- * Cart reminder: one notification and email 24 hours after a cart is
--   left with items, for Passes that allow marketing messages
--   (`marketing_opt_in`). Once per cart: a new reminder only after the
--   cart changed again (`cart_reminders.sent_at`); carts older than 7
--   days are left alone.
--
-- `take_review_requests` and `take_cart_reminders` (the API's job, service
-- role only) mark what they hand out, add the notification (push,
-- Telegram, WhatsApp as the member chose) and return what the email needs.

-- ── Review requests ────────────────────────────────────────────────────────

alter table public.orders add column review_requested_at timestamptz;

comment on column public.orders.review_requested_at is
  'When the member was asked to review this order''s items (once).';

-- When an order was delivered: its last delivered parcel, else when it was
-- marked delivered.
create function private.order_delivered_at(target public.orders)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select max(s.delivered_at) from public.shipments s where s.order_id = target.id),
    target.updated_at
  )
$$;

create function public.take_review_requests(batch integer default 50)
returns table (
  order_id uuid,
  user_id uuid,
  number bigint,
  email text,
  locale text,
  items jsonb
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select o.id
    from public.orders o
    where o.status = 'delivered'
      and o.review_requested_at is null
      and not o.is_gift
      and o.user_id is not null
      and private.order_delivered_at(o) <= now() - interval '3 days'
      and private.order_delivered_at(o) > now() - interval '10 days'
    order by o.created_at
    limit least(greatest(coalesce(batch, 50), 1), 200)
    for update skip locked
  ),
  marked as (
    update public.orders o set review_requested_at = now()
    from due where o.id = due.id
    returning o.id, o.user_id, o.number
  ),
  wanted as (
    select m.id as order_id, jsonb_agg(
      jsonb_build_object('slug', p.slug, 'name_en', p.name_en, 'name_ar', p.name_ar)
      order by p.name_en
    ) as items
    from marked m
    join lateral (
      select distinct i.product_id
      from public.order_items i
      where i.order_id = m.id and i.kind = 'sale' and i.product_id is not null
    ) bought on true
    join public.products p on p.id = bought.product_id
    where not exists (
      select 1 from public.product_reviews r
      where r.user_id = m.user_id and r.product_id = bought.product_id
    )
    group by m.id
  )
  select m.id, m.user_id, m.number, u.email::text, coalesce(pr.locale, 'ar')::text, w.items
  from marked m
  join wanted w on w.order_id = m.id
  join auth.users u on u.id = m.user_id
  left join public.profiles pr on pr.id = m.user_id;
end;
$$;

comment on function public.take_review_requests(integer) is
  'Orders delivered 3 days ago to ask for reviews (marked once), with the items not reviewed yet; the API''s job.';

-- The notification goes with the request.
create function private.notify_review_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first public.products;
  left_to_review integer;
begin
  if old.review_requested_at is not null or new.review_requested_at is null then
    return null;
  end if;
  select p.* into first
  from public.order_items i
  join public.products p on p.id = i.product_id
  where i.order_id = new.id and i.kind = 'sale'
    and not exists (
      select 1 from public.product_reviews r
      where r.user_id = new.user_id and r.product_id = p.id
    )
  order by p.name_en
  limit 1;
  if first.id is null then
    return null;
  end if;
  select count(distinct i.product_id) into left_to_review
  from public.order_items i
  where i.order_id = new.id and i.kind = 'sale' and i.product_id is not null
    and not exists (
      select 1 from public.product_reviews r
      where r.user_id = new.user_id and r.product_id = i.product_id
    );
  perform private.notify(
    new.user_id, 'order', 'review_request',
    jsonb_build_object(
      'number', new.number, 'name_en', first.name_en, 'name_ar', first.name_ar,
      'count', left_to_review
    ),
    '/store/' || first.slug || '#reviews'
  );
  return null;
end;
$$;

create trigger notify_review_request
  after update of review_requested_at on public.orders
  for each row execute function private.notify_review_request();

-- ── Cart reminders ─────────────────────────────────────────────────────────

create table public.cart_reminders (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sent_at timestamptz not null default now()
);

comment on table public.cart_reminders is
  'When each member was last reminded of their cart (once per cart change).';

alter table public.cart_reminders enable row level security;

create policy "No client access" on public.cart_reminders
  as restrictive for all to anon, authenticated
  using (false);

revoke all on public.cart_reminders from anon, authenticated;

create function public.take_cart_reminders(batch integer default 50)
returns table (
  user_id uuid,
  email text,
  locale text,
  items jsonb
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return query
  with carts as (
    select c.user_id, max(greatest(c.created_at, c.updated_at)) as changed_at
    from public.cart_items c
    group by c.user_id
  ),
  due as (
    select carts.user_id
    from carts
    join public.profiles p on p.id = carts.user_id
    left join public.cart_reminders r on r.user_id = carts.user_id
    where p.marketing_opt_in
      and p.banned_at is null
      and carts.changed_at <= now() - interval '24 hours'
      and carts.changed_at > now() - interval '7 days'
      and (r.sent_at is null or r.sent_at < carts.changed_at)
    order by carts.changed_at
    limit least(greatest(coalesce(batch, 50), 1), 200)
  ),
  marked as (
    insert into public.cart_reminders (user_id, sent_at)
    select due.user_id, now() from due
    on conflict on constraint cart_reminders_pkey do update set sent_at = excluded.sent_at
    returning cart_reminders.user_id
  ),
  noted as (
    select m.user_id, (select private.notify(
      m.user_id, 'promo', 'cart_reminder',
      jsonb_build_object('count', (select count(*) from public.cart_items c where c.user_id = m.user_id)),
      '/cart'
    )) as done
    from marked m
  )
  select n.user_id, u.email::text, coalesce(pr.locale, 'ar')::text, (
    select jsonb_agg(
      jsonb_build_object('slug', p.slug, 'name_en', p.name_en, 'name_ar', p.name_ar, 'quantity', c.quantity)
      order by c.created_at
    )
    from public.cart_items c
    join public.products p on p.id = c.product_id
    where c.user_id = n.user_id
  )
  from noted n
  join auth.users u on u.id = n.user_id
  left join public.profiles pr on pr.id = n.user_id;
end;
$$;

comment on function public.take_cart_reminders(integer) is
  'Carts left 24 hours with items, for Passes that allow marketing (once per cart change), with their items; the API''s job.';

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.order_delivered_at(public.orders) from public, anon, authenticated;
revoke all on function private.notify_review_request() from public, anon, authenticated;
revoke all on function public.take_review_requests(integer) from public, anon, authenticated;
grant execute on function public.take_review_requests(integer) to service_role;
revoke all on function public.take_cart_reminders(integer) from public, anon, authenticated;
grant execute on function public.take_cart_reminders(integer) to service_role;
