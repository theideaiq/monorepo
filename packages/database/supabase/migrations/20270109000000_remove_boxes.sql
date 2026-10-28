-- Boxes are removed (owner decisions of 2026-10-28, section 8; shops'
-- bundles will replace them). The apps stopped showing and selling them in
-- the previous release. This deletes the boxes (their products, with their
-- versions, cart lines, saved items and reviews; order lines keep their
-- names and prices, their product becomes null), the box tables and
-- columns, and every function and trigger that handled boxes. Stock, order
-- taking and offers work as for any product.

-- ── Functions that had a box branch ──────────────────────────────────────────

create or replace function private.copies_for_line(line_product uuid, line_variant uuid, line_condition public.product_condition, wanted integer, line_seller uuid default null)
returns table(stock_item uuid, price bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select s.id, coalesce(s.price, v.price)
  from public.stock_items s
  join public.products p on p.id = s.product_id
  join public.product_variants v on v.id = s.variant_id
  join public.sellers sl on sl.id = s.seller_id
  where s.product_id = line_product
    and s.variant_id = line_variant
    and s.seller_id = coalesce(line_seller, '00000000-0000-4000-8000-000000000001')
    and sl.status = 'approved'
    and v.active
    and s.purpose = 'sale'
    and s.status = 'available'
    and s.condition = coalesce(line_condition, p.condition)
  order by 2, s.created_at
  limit wanted;
end;
$$;

create or replace function private.sync_stock_counts(target_product uuid, target_variant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('idea.stock_sync', 'on', true);

  if target_variant is not null then
    update public.product_variants v set
      stock_count = (
        select count(*) from public.stock_items s
        where s.variant_id = v.id and s.status = 'available' and s.purpose = 'sale'
      ),
      rental_stock = (
        select count(*) from public.stock_items s
        where s.variant_id = v.id and s.status = 'available' and s.purpose = 'rental'
      )
    where v.id = target_variant;
  end if;

  update public.products p set
    stock_count = (
      select count(*) from public.stock_items s
      join public.product_variants v on v.id = s.variant_id
      where s.product_id = p.id
        and v.active
        and s.status = 'available'
        and s.purpose = case when p.kind = 'rental' then 'rental' else 'sale' end::public.stock_purpose
    ),
    rental_stock = (
      select count(*) from public.stock_items s
      join public.product_variants v on v.id = s.variant_id
      where s.product_id = p.id and v.active and s.status = 'available' and s.purpose = 'rental'
    ),
    rentable = p.kind = 'rental' or exists (
      select 1 from public.stock_items s
      join public.product_variants v on v.id = s.variant_id
      where s.product_id = p.id and v.active and s.purpose = 'rental'
        and s.status in ('available', 'reserved', 'rented', 'repair')
    )
  where p.id = target_product;

  perform set_config('idea.stock_sync', 'off', true);
end;
$$;

create or replace function private.take_order_stock(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.order_items;
begin
  for item in select * from public.order_items where order_id = target loop
    if item.kind = 'sale' then
      update public.stock_items set status = 'sold', order_item_id = item.id
      where id in (
        select c.stock_item
        from private.copies_for_line(item.product_id, item.variant_id, item.condition, item.quantity, item.seller_id) c
      );
    elsif item.kind = 'keep' then
      update public.stock_items
      set status = 'sold', order_item_id = item.id, rental_id = null
      where rental_id = item.rental_id and status = 'rented';
      update public.rentals set status = 'kept', returned_at = now()
      where id = item.rental_id and status in ('active', 'overdue');
    end if;
  end loop;
end;
$$;

-- ── Triggers, then the boxes themselves ──────────────────────────────────────

drop trigger no_box_copies on public.stock_items;
drop trigger on_box_product_change on public.products;
drop trigger check_box_theme on public.cart_items;
drop trigger on_box_order_item on public.order_items;
drop trigger on_box_change on public.boxes;
drop trigger on_box_part_change on public.box_parts;

delete from public.products p
using public.boxes b
where b.product_id = p.id;

alter table public.cart_items drop column box_theme_id;
alter table public.order_items drop column box_theme_id;

drop table public.box_themes, public.box_parts, public.boxes;

drop function public.pack_box(uuid, uuid[]);
drop function public.box_slot_copies(uuid);
drop function private.pack_box(uuid, uuid[]);
drop function private.box_slot_copies(uuid);
drop function private.box_price_ok(uuid);
drop function private.box_value(uuid);
drop function private.check_box(uuid);
drop function private.sync_box_stock(uuid);
drop function private.sync_boxes_with(uuid);
drop function private.box_stock(uuid);
drop function private.is_box(uuid);
drop function private.check_cart_box_theme();
drop function private.no_box_copies();
drop function private.on_box_change();
drop function private.on_box_order_item();
drop function private.on_box_product_change();
