-- The customer hears where their return is: accepted (a courier will
-- collect it, or it's already back), rejected, and refunded. Requests the
-- customer withdraws, and the steps in between, stay quiet.
create function private.notify_return_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event text := case
    when new.status = 'approved' then 'return_approved'
    when new.status = 'rejected' then 'return_rejected'
    when new.status = 'refund_due' then 'return_refund_due'
    when new.status = 'refunded' then 'return_refunded'
  end;
begin
  if event is null or new.status = old.status then
    return null;
  end if;
  perform private.notify(
    new.user_id, 'order', event,
    (select jsonb_build_object(
      'number', new.number,
      'order_number', o.number,
      'name_en', i.name_en,
      'name_ar', i.name_ar,
      'amount', new.refund_amount
    )
    from public.order_items i join public.orders o on o.id = i.order_id
    where i.id = new.order_item_id),
    '/pass/orders/' || new.order_id
  );
  return null;
end;
$$;

create trigger notify_return_status after update of status on public.returns
  for each row execute function private.notify_return_status();
