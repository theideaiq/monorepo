-- Catalog, part 3 (master brief section 11): textbooks rent for a
-- semester, with the term dates set in Staff.
--
-- * `academic_terms`: each term's name and dates (Finance sets them in
--   Staff → Finance → Rentals).
-- * `rental_rates.per_term`: the category's price is for the rest of the
--   current term rather than a number of days (Textbooks).
-- * The term for a new rental is the one running now, or the next one
--   starting within 30 days; the rental is due at its end. With no such
--   term, a per-term category can't be rented.
-- Textbook resale between students comes later (master brief step 14).

create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null check (char_length(name_ar) between 1 and 120),
  name_en text not null check (char_length(name_en) between 1 and 120),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_terms_dates check (ends_on > starts_on)
);

comment on table public.academic_terms is
  'University terms: textbooks (per-term rental rates) rent until the end of the current one.';

create index academic_terms_ends_idx on public.academic_terms (ends_on);

alter table public.academic_terms enable row level security;

create policy "Terms are public" on public.academic_terms
  for select to anon, authenticated using (true);
create policy "Finance adds terms" on public.academic_terms
  for insert to authenticated
  with check ((select private.has_staff_role('{finance}')));
create policy "Finance edits terms" on public.academic_terms
  for update to authenticated
  using ((select private.has_staff_role('{finance}')))
  with check ((select private.has_staff_role('{finance}')));
create policy "Finance removes terms" on public.academic_terms
  for delete to authenticated
  using ((select private.has_staff_role('{finance}')));

grant select on public.academic_terms to anon, authenticated;
grant insert, update, delete on public.academic_terms to authenticated;

create trigger set_updated_at before update on public.academic_terms
  for each row execute function private.set_updated_at();

alter table public.rental_rates
  add column per_term boolean not null default false;

comment on column public.rental_rates.per_term is
  'The price is for the rest of the current academic term (days is not used).';

-- A term runs longer than the 60 days a rental could run.
alter table public.rentals drop constraint rentals_days_check,
  add constraint rentals_days_check check (days between 1 and 200);

update public.rental_rates r set per_term = true
from public.product_categories c
where c.id = r.category_id and c.slug = 'textbooks';

-- ── The term ───────────────────────────────────────────────────────────────

-- The term a rental starting today runs to: the one running now, or the
-- next one starting within 30 days (Baghdad dates).
create function private.rental_term()
returns public.academic_terms
language sql
stable
security definer
set search_path = ''
as $$
  select t.* from public.academic_terms t
  where t.ends_on > (now() at time zone 'Asia/Baghdad')::date
    and t.starts_on <= (now() at time zone 'Asia/Baghdad')::date + 30
  order by t.ends_on
  limit 1
$$;

create function public.rental_term()
returns setof public.academic_terms
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.rental_term() where id is not null $$;

comment on function public.rental_term() is
  'The academic term a textbook rented today runs to (none between terms).';

-- As before; a per-term rate runs to the end of the term.
create or replace function private.rental_quote(product uuid, variant uuid default null)
returns table (price bigint, days integer, late_fee bigint, deposit bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.price,
    case when r.per_term
      then t.ends_on - (now() at time zone 'Asia/Baghdad')::date
      else r.days
    end,
    r.late_fee,
    case when private.is_student((select auth.uid())) then 0::bigint
      else (floor(coalesce(v.price, p.price) * s.rental_deposit_rate / 100 / 250) * 250)::bigint
    end
  from public.products p
  join public.rental_rates r on r.category_id = p.category_id
  cross join public.store_settings s
  left join lateral (select * from private.rental_term()) t on r.per_term
  left join public.product_variants v
    on v.id = coalesce(variant, (
      select x.id from public.product_variants x
      where x.product_id = p.id and x.active
        and exists (select 1 from public.stock_items c where c.variant_id = x.id and c.purpose = 'rental')
      order by x.position limit 1
    ))
  where p.id = product and p.status = 'active' and p.rentable
    and (not r.per_term or t.id is not null);
$$;

-- A per-term rental is due at the end of the term's last day.
create function private.set_term_due()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  term public.academic_terms;
begin
  if new.kind = 'single' and new.due_at is null and exists (
    select 1 from public.products p
    join public.rental_rates r on r.category_id = p.category_id
    where p.id = new.product_id and r.per_term
  ) then
    term := private.rental_term();
    if term.id is not null then
      new.due_at := ((term.ends_on + 1)::timestamp at time zone 'Asia/Baghdad');
    end if;
  end if;
  return new;
end;
$$;

create trigger set_term_due before insert on public.rentals
  for each row execute function private.set_term_due();

-- As before; each per-term item says when it's due (`until`).
create or replace function private.rentals_quote(items jsonb, delivery_zone uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  line record;
  quote record;
  zone public.delivery_zones;
  lines jsonb := '[]'::jsonb;
  rent bigint := 0;
  deposits bigint := 0;
  fee bigint;
  term_end date := (private.rental_term()).ends_on;
begin
  for line in select * from private.rental_items(items) loop
    select * into quote from private.rental_quote(line.product, line.variant);
    if quote.price is null then
      raise exception 'Item not available' using errcode = 'no_data_found';
    end if;
    lines := lines || jsonb_build_object(
      'product', line.product, 'variant', line.variant, 'price', quote.price,
      'days', quote.days, 'late_fee', quote.late_fee, 'deposit', quote.deposit,
      'until', case when exists (
        select 1 from public.products p
        join public.rental_rates r on r.category_id = p.category_id
        where p.id = line.product and r.per_term
      ) then term_end end
    );
    rent := rent + quote.price;
    deposits := deposits + quote.deposit;
  end loop;

  select * into zone from public.delivery_zones z where z.id = delivery_zone and z.active;
  if zone.id is not null then
    fee := private.rental_delivery_fee(zone, private.member_plan((select auth.uid())), rent);
  end if;

  return jsonb_build_object(
    'items', lines,
    'rent', rent,
    'deposit', deposits,
    'fee', fee,
    'free_from', zone.free_from,
    'total', rent + deposits + coalesce(fee, 0)
  );
end;
$$;

revoke all on function private.rental_term() from public, anon, authenticated;
revoke all on function private.set_term_due() from public, anon, authenticated;
revoke all on function public.rental_term() from public;
grant execute on function private.rental_term() to anon, authenticated;
grant execute on function public.rental_term() to anon, authenticated;
