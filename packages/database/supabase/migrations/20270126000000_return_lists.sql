-- Selling: what Partners shows a shop about returns (owner's master brief,
-- 2026-10-28, section 6). Shops can't read orders, order lines or parcels,
-- so these list theirs with the item and the customer only as "first
-- name · area", like `seller_order_lines`.
--
-- * `seller_returns(shop)`: the shop's returns, newest first, with what it
--   must do and by when.
-- * `seller_parcels_back(shop)`: parcels refused at the door that Boxy
--   brought back, for the shop to confirm (`confirm_parcel_back`).

create function private.seller_returns(shop uuid)
returns table (
  return_id uuid,
  number bigint,
  status public.return_status,
  reason public.return_reason,
  details text,
  photos text[],
  quantity integer,
  unopened boolean,
  fault public.return_fault,
  respond_by timestamptz,
  check_by timestamptz,
  shop_note text,
  staff_note text,
  condition_ok boolean,
  condition_note text,
  collection_fee bigint,
  received_at timestamptz,
  refund_amount bigint,
  created_at timestamptz,
  order_number text,
  name_ar text,
  name_en text,
  attributes jsonb,
  condition public.product_condition,
  unit_price bigint,
  customer text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.handles_returns(shop) or private.has_staff_role('{support,finance}')) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      r.id, r.number, r.status, r.reason, r.details, r.photos, r.quantity, r.unopened, r.fault,
      r.respond_by, r.check_by, r.shop_note, r.staff_note, r.condition_ok, r.condition_note,
      r.collection_fee, r.received_at, r.refund_amount, r.created_at,
      o.number::text, i.name_ar, i.name_en, i.attributes, i.condition, i.unit_price,
      concat_ws(' · ',
        nullif(split_part(trim(coalesce(o.shipping_address ->> 'full_name', '')), ' ', 1), ''),
        nullif(trim(coalesce(o.shipping_address ->> 'city', '')), ''))
    from public.returns r
    join public.order_items i on i.id = r.order_item_id
    join public.orders o on o.id = r.order_id
    where r.seller_id = shop
    order by (r.status in ('requested', 'received')) desc, r.created_at desc;
end;
$$;

create function public.seller_returns(shop uuid)
returns table (
  return_id uuid,
  number bigint,
  status public.return_status,
  reason public.return_reason,
  details text,
  photos text[],
  quantity integer,
  unopened boolean,
  fault public.return_fault,
  respond_by timestamptz,
  check_by timestamptz,
  shop_note text,
  staff_note text,
  condition_ok boolean,
  condition_note text,
  collection_fee bigint,
  received_at timestamptz,
  refund_amount bigint,
  created_at timestamptz,
  order_number text,
  name_ar text,
  name_en text,
  attributes jsonb,
  condition public.product_condition,
  unit_price bigint,
  customer text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.seller_returns(shop) $$;

create function private.seller_parcels_back(shop uuid)
returns table (
  shipment_id uuid,
  order_number text,
  tracking_code text,
  returned_at timestamptz,
  items text,
  customer text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.handles_returns(shop) or private.has_staff_role('{support,finance}')) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      s.id, o.number::text, s.tracking_code, s.returned_at,
      (select string_agg(i.name_en || ' ×' || i.quantity, ', ' order by i.name_en)
        from public.order_items i where i.shipment_id = s.id),
      concat_ws(' · ',
        nullif(split_part(trim(coalesce(o.shipping_address ->> 'full_name', '')), ' ', 1), ''),
        nullif(trim(coalesce(o.shipping_address ->> 'city', '')), ''))
    from public.shipments s
    join public.orders o on o.id = s.order_id
    where s.seller_id = shop and s.return_id is null
      and s.returned_at is not null and s.delivered_at is null
      and s.back_confirmed_at is null
    order by s.returned_at;
end;
$$;

create function public.seller_parcels_back(shop uuid)
returns table (
  shipment_id uuid,
  order_number text,
  tracking_code text,
  returned_at timestamptz,
  items text,
  customer text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.seller_parcels_back(shop) $$;

revoke all on function private.seller_returns(uuid) from public, anon;
revoke all on function public.seller_returns(uuid) from public, anon;
grant execute on function private.seller_returns(uuid) to authenticated;
grant execute on function public.seller_returns(uuid) to authenticated;

revoke all on function private.seller_parcels_back(uuid) from public, anon;
revoke all on function public.seller_parcels_back(uuid) from public, anon;
grant execute on function private.seller_parcels_back(uuid) to authenticated;
grant execute on function public.seller_parcels_back(uuid) to authenticated;
