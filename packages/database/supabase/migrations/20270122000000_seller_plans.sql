-- Selling: commission and the Free and Pro plans (owner's master brief,
-- 2026-10-28, section 7).
--
-- * `commission_rates`: the commission per category, standard and Pro,
--   edited by finance staff in Staff. Books, Music and Films 12% / 10%,
--   Games 10% / 8%, Gear 9% / 7%.
-- * `sellers.plan`: 'free' (up to 100 active listings) or 'pro'
--   (unlimited, commission from the Pro column; 49,750 IQD a month or
--   497,500 IQD a year, taken from payouts). The IDEA's own stock pays
--   no commission.
-- * Each shop's order line keeps the rate, the commission and the payout
--   after commission at the time of the order (`order_items`), so later
--   rate or plan changes never rewrite past orders. Payouts (section 8)
--   build on these columns.

create table public.commission_rates (
  category_id uuid primary key references public.product_categories (id) on delete cascade,
  standard_rate numeric(5, 4) not null check (standard_rate between 0 and 0.5),
  pro_rate numeric(5, 4) not null check (pro_rate between 0 and 0.5),
  updated_at timestamptz not null default now(),
  check (pro_rate <= standard_rate)
);

comment on table public.commission_rates is
  'Commission on a shop''s sales per category: the standard rate and the lower Pro rate (fractions, 0.12 = 12%).';

alter table public.commission_rates enable row level security;

-- Shops see the rates they sell at; finance staff change them.
create policy "Rates are public" on public.commission_rates
  for select to anon, authenticated using (true);
create policy "Finance edits rates" on public.commission_rates
  for update to authenticated
  using ((select private.has_staff_role('{finance}')))
  with check ((select private.has_staff_role('{finance}')));

revoke all on public.commission_rates from anon, authenticated;
grant select on public.commission_rates to anon, authenticated;
grant update (standard_rate, pro_rate) on public.commission_rates to authenticated;

create trigger set_updated_at before update on public.commission_rates
  for each row execute function private.set_updated_at();

-- The brief's rates by category; any other category starts at 12% / 10%
-- until finance sets it.
create function private.default_commission(slug text, pro boolean)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when slug = 'games' then case when pro then 0.08 else 0.10 end
    when slug = 'gear' then case when pro then 0.07 else 0.09 end
    else case when pro then 0.10 else 0.12 end
  end
$$;

insert into public.commission_rates (category_id, standard_rate, pro_rate)
select c.id, private.default_commission(c.slug, false), private.default_commission(c.slug, true)
from public.product_categories c
on conflict (category_id) do nothing;

-- A category added later (or by the seed) gets its default.
create function private.add_commission_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.commission_rates (category_id, standard_rate, pro_rate)
  values (new.id, private.default_commission(new.slug, false), private.default_commission(new.slug, true))
  on conflict (category_id) do nothing;
  return new;
end;
$$;

create trigger add_commission_rate after insert on public.product_categories
  for each row execute function private.add_commission_rate();

-- ── Plans ──────────────────────────────────────────────────────────────────

create type public.seller_plan as enum ('free', 'pro');

alter table public.sellers
  add column plan public.seller_plan not null default 'free',
  -- Pro is billed monthly or yearly, from payouts.
  add column plan_billing text check (plan_billing in ('monthly', 'yearly')),
  add column plan_since timestamptz,
  add constraint sellers_plan_billing check ((plan = 'pro') = (plan_billing is not null));

comment on column public.sellers.plan is
  'Free (up to 100 active listings) or Pro (unlimited, lower commission, 49,750 IQD a month or 497,500 a year from payouts).';

-- What each plan costs and allows, in one place.
create function private.seller_plan_limit(plan public.seller_plan)
returns integer
language sql
immutable
set search_path = ''
as $$ select case plan when 'free' then 100 end $$;

create function public.seller_plan_price(billing text)
returns bigint
language sql
immutable
set search_path = ''
as $$ select case billing when 'monthly' then 49750 when 'yearly' then 497500 end::bigint $$;

grant execute on function public.seller_plan_price(text) to anon, authenticated;

-- An owner or admin of the shop (or finance staff) changes its plan.
create function private.set_seller_plan(target uuid, new_plan public.seller_plan, billing text default null)
returns public.sellers
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop public.sellers;
  active_count integer;
begin
  select * into shop from public.sellers s where s.id = target for update;
  if shop.id is null or shop.is_house then
    raise exception 'Shop not found' using errcode = 'no_data_found';
  end if;
  if not (
    private.has_org_role(shop.organization_id, '{owner,admin}')
    or private.has_staff_role('{finance}')
  ) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if new_plan = 'pro' and billing not in ('monthly', 'yearly') then
    raise exception 'Choose monthly or yearly' using errcode = 'check_violation';
  end if;
  if new_plan = 'free' then
    select count(*) into active_count from public.seller_offers o
    where o.seller_id = target and o.active;
    if active_count > private.seller_plan_limit('free') then
      raise exception 'Free allows % active listings; end some first', private.seller_plan_limit('free')
        using errcode = 'check_violation';
    end if;
  end if;

  update public.sellers set
    plan = new_plan,
    plan_billing = case when new_plan = 'pro' then billing end,
    plan_since = case when shop.plan is distinct from new_plan then now() else shop.plan_since end
  where id = target
  returning * into shop;
  return shop;
end;
$$;

create function public.set_seller_plan(target uuid, new_plan public.seller_plan, billing text default null)
returns public.sellers
language sql
security invoker
set search_path = ''
as $$ select private.set_seller_plan(target, new_plan, billing) $$;

revoke all on function private.set_seller_plan(uuid, public.seller_plan, text) from public, anon;
revoke all on function public.set_seller_plan(uuid, public.seller_plan, text) from public, anon;
grant execute on function private.set_seller_plan(uuid, public.seller_plan, text) to authenticated;
grant execute on function public.set_seller_plan(uuid, public.seller_plan, text) to authenticated;

-- Free shops list up to 100 offers at once; ending one frees a place.
create function private.check_listing_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop public.sellers;
  allowed integer;
begin
  if not new.active or (tg_op = 'UPDATE' and old.active) then
    return new;
  end if;
  select * into shop from public.sellers s where s.id = new.seller_id;
  allowed := private.seller_plan_limit(shop.plan);
  if shop.is_house or allowed is null then
    return new;
  end if;
  if (
    select count(*) from public.seller_offers o
    where o.seller_id = new.seller_id and o.active and o.id is distinct from new.id
  ) >= allowed then
    raise exception 'Free allows % active listings; upgrade to Pro for more', allowed
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_listing_limit before insert or update of active on public.seller_offers
  for each row execute function private.check_listing_limit();

-- ── Commission on each order line ──────────────────────────────────────────

alter table public.order_items
  add column commission_rate numeric(5, 4),
  add column commission bigint check (commission >= 0),
  add column seller_payout bigint check (seller_payout >= 0);

comment on column public.order_items.commission is
  'The IDEA''s commission on a shop''s line (unit price × quantity × rate, rounded), fixed when ordered; null for The IDEA''s own stock.';
comment on column public.order_items.seller_payout is
  'What the shop is owed for the line before refunds and fees: the line total less the commission.';

-- The rate a shop sells a product at today.
create function private.commission_rate_for(shop uuid, item uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case when s.plan = 'pro' then r.pro_rate else r.standard_rate end
  from public.sellers s
  join public.products p on p.id = commission_rate_for.item
  left join public.commission_rates r on r.category_id = p.category_id
  where s.id = commission_rate_for.shop and not s.is_house;
$$;

revoke all on function private.commission_rate_for(uuid, uuid) from public, anon, authenticated;

create function private.set_line_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rate numeric;
  total bigint;
begin
  if new.seller_id is null then
    return new;
  end if;
  rate := private.commission_rate_for(new.seller_id, new.product_id);
  if rate is null then
    -- The IDEA's own stock, or a product with no category.
    if exists (select 1 from public.sellers s where s.id = new.seller_id and not s.is_house) then
      rate := 0.12;
    else
      return new;
    end if;
  end if;
  total := new.unit_price * new.quantity;
  new.commission_rate := rate;
  new.commission := round(total * rate)::bigint;
  new.seller_payout := total - new.commission;
  return new;
end;
$$;

create trigger set_line_commission before insert on public.order_items
  for each row execute function private.set_line_commission();
