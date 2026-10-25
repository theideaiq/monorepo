-- Two gaps from the launch checklist (PROGRESS.md):
--
-- * Plans get an Arabic name (`plans.name_ar`); Arabic pages show it, and
--   fall back to `name` (English) while it's empty.
-- * Support staff open a ticket on a customer's behalf
--   (`open_support_ticket_for`): the ticket is the customer's, its first
--   message is the staff member's, so it waits on the customer (pending)
--   and the customer is notified like for any staff reply.

-- ── Arabic plan names ──────────────────────────────────────────────────────

alter table public.plans
  add column name_ar text check (char_length(name_ar) between 1 and 120);

comment on column public.plans.name is
  'The plan''s name in English (and in Arabic while name_ar is empty).';
comment on column public.plans.name_ar is
  'The plan''s name in Arabic; null shows the English name.';

-- ── Tickets opened by staff ────────────────────────────────────────────────

create function private.open_support_ticket_for(
  customer uuid,
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
  if caller is null or not private.has_staff_role('{support}') then
    raise exception 'Only support staff open tickets for customers'
      using errcode = 'insufficient_privilege';
  end if;

  if customer is null or not exists (select 1 from public.profiles where id = customer) then
    raise exception 'Customer not found' using errcode = 'no_data_found';
  end if;

  if ticket_order is not null
    and not exists (select 1 from public.orders where id = ticket_order and user_id = customer)
  then
    raise exception 'Order not found' using errcode = 'no_data_found';
  end if;

  insert into public.support_tickets (user_id, subject, topic, order_id, assigned_to)
  values (customer, ticket_subject, ticket_topic, ticket_order, caller)
  returning * into created;

  -- The staff member's message: on_support_message moves the ticket to
  -- pending, notify_support_reply tells the customer.
  insert into public.support_messages (ticket_id, author_id, body)
  values (created.id, caller, ticket_body);

  select * into created from public.support_tickets where id = created.id;
  return created;
end;
$$;

create function public.open_support_ticket_for(
  customer uuid,
  ticket_subject text,
  ticket_body text,
  ticket_topic public.ticket_topic default 'other',
  ticket_order uuid default null
)
returns public.support_tickets
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.open_support_ticket_for($1, $2, $3, $4, $5) $$;

revoke all on function private.open_support_ticket_for(uuid, text, text, public.ticket_topic, uuid) from public, anon;
grant execute on function private.open_support_ticket_for(uuid, text, text, public.ticket_topic, uuid) to authenticated, service_role;
revoke all on function public.open_support_ticket_for(uuid, text, text, public.ticket_topic, uuid) from public, anon, authenticated, service_role;
grant execute on function public.open_support_ticket_for(uuid, text, text, public.ticket_topic, uuid) to authenticated, service_role;
