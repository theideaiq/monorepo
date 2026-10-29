-- Saved, part 3 (owner's master brief, step 8, section 12): "Notify me"
-- now saves the product to Saved with "Tell me" on, so `product_alerts`
-- goes. Its rows were copied into Saved by 20270205000000.

-- The first copy for sale tells members who saved the product with "Tell
-- me" on ("Out now" within 14 days of its release date). That one notice
-- is enough: its price becomes the last one told, so the price trigger
-- doesn't tell it again, and a price notice already sent in the same
-- transaction is withdrawn.
create or replace function private.notify_product_alerts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.products;
begin
  if new.status <> 'available' or new.purpose <> 'sale' then
    return new;
  end if;
  select * into item from public.products p where p.id = new.product_id;
  if item.status <> 'active' then
    return new;
  end if;
  if exists (
    select 1 from public.stock_items s
    where s.product_id = new.product_id and s.purpose = 'sale' and s.status = 'available'
      and s.id <> new.id
  ) then
    return new;
  end if;

  delete from public.notifications n
  where n.event = 'saved_price_drop' and n.created_at = now()
    and n.data ->> 'product_id' = item.id::text;

  update public.wishlist_items w
  set alerted_price = private.listing_price(new.seller_id, new.variant_id, new.condition)
  where w.product_id = item.id and w.notify;

  insert into public.notifications (user_id, kind, event, data, link)
  select w.user_id, 'system',
    case when item.release_date between private.baghdad_today() - 14 and private.baghdad_today()
      then 'saved_out_now' else 'saved_back_in_stock' end,
    jsonb_build_object('product_id', item.id, 'name_en', item.name_en, 'name_ar', item.name_ar),
    '/store/' || item.slug
  from public.wishlist_items w
  where w.product_id = item.id and w.notify;
  return new;
end;
$$;

drop table public.product_alerts;
