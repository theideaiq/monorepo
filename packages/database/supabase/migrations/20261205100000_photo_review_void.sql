-- Hiding a photo review voids its 5-Bulb bonus by member and product, so it
-- also catches a bonus earned by an earlier review of the same product that
-- the member deleted (its entry keeps the product but loses the review id).

create or replace function private.on_review_bulbs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'hidden' then
    update public.bulb_entries set status = 'void'
    where user_id = new.user_id and product_id = new.product_id
      and reason = 'photo_review' and status <> 'void';
  elsif new.status = 'published' and new.verified_purchase and cardinality(new.photos) > 0 then
    insert into public.bulb_entries (user_id, amount, kind, review_id, product_id, reason)
    values (new.user_id, 5, 'bonus', new.id, new.product_id, 'photo_review')
    on conflict do nothing;
  end if;
  return null;
end;
$$;

revoke all on function private.on_review_bulbs() from public, anon, authenticated;
