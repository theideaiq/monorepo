-- Verified phone numbers (owner decisions 2026-10-28, item 7: "phone now").
--
-- * `verified_phones` lists the numbers a Pass proved it owns with a code
--   (Twilio Verify, WhatsApp first and SMS as the fallback). Only the API
--   adds rows, after Twilio approves the code; the owner reads and removes
--   their own.
-- * A number the Pass signed in with by SMS (`auth.users.phone` with
--   `phone_confirmed_at`) counts as verified too.
-- * `store_settings.require_verified_phone` turns the check on. It is off
--   until Twilio is configured (see the launch checklist in PROGRESS.md);
--   then deliveries and Plus homes need a verified number.

create table public.verified_phones (
  user_id uuid not null references auth.users (id) on delete cascade,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  verified_at timestamptz not null default now(),
  primary key (user_id, phone)
);

alter table public.verified_phones enable row level security;

create policy "Owners read their verified phones"
  on public.verified_phones for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Owners remove their verified phones"
  on public.verified_phones for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.verified_phones from anon, authenticated;
grant select, delete on public.verified_phones to authenticated;

alter table public.store_settings
  add column require_verified_phone boolean not null default false;

-- Staff admins turn it on in Catalogue → Settings (the table's policy
-- limits updates to them).
grant update (require_verified_phone) on public.store_settings to authenticated;

-- Whether `who` proved they own `phone` (E.164).
create function private.phone_is_verified(who uuid, phone text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.verified_phones v
    where v.user_id = who and v.phone = phone_is_verified.phone
  ) or exists (
    select 1 from auth.users u
    where u.id = who
      and u.phone_confirmed_at is not null
      and '+' || u.phone = phone_is_verified.phone
  );
$$;

revoke all on function private.phone_is_verified(uuid, text) from public;

-- Whether the caller's number is verified; the checkout asks before it
-- places an order.
create function private.is_phone_verified(phone text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.phone_is_verified((select auth.uid()), phone);
$$;

create function public.is_phone_verified(phone text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_phone_verified(phone) $$;

revoke all on function private.is_phone_verified(text) from public, anon;
revoke all on function public.is_phone_verified(text) from public, anon;
grant execute on function private.is_phone_verified(text) to authenticated;
grant execute on function public.is_phone_verified(text) to authenticated;

-- Customers' own deliveries go to a number they verified. Orders made for
-- them by staff or scheduled jobs (Plus swaps) aren't checked here; the
-- Plus home they go to is.
create function private.require_verified_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  phone text;
begin
  if caller is null or caller is distinct from new.user_id then
    return new;
  end if;
  if not coalesce(
    (select s.require_verified_phone from public.store_settings s), false
  ) then
    return new;
  end if;

  if tg_table_name = 'orders' then
    if new.fulfilment <> 'delivery' then
      return new;
    end if;
    phone := new.shipping_address ->> 'phone';
  else
    phone := new.phone;
  end if;

  if phone is null or not private.phone_is_verified(caller, phone) then
    raise exception 'Verify your phone number first'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger require_verified_phone before insert on public.orders
  for each row execute function private.require_verified_phone();

create trigger require_verified_phone before insert or update of phone
  on public.plus_homes
  for each row execute function private.require_verified_phone();
