-- PR 7, C9: watch an auction and hear when it is about to end.
--
-- * `auction_watches`: a member watches a live auction (one row each; they
--   see, add and remove only their own).
-- * `remind_auction_watchers()`: run once a day by the API's selling sweep.
--   Every watcher of a live auction ending within the next 24 hours hears
--   so once (`auction_ending`, linking to the auction), unless they already
--   lead it. The API's crons run daily, so "within a day" is the promise.

create table public.auction_watches (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  auction_id uuid not null references public.auctions (id) on delete cascade,
  created_at timestamptz not null default now(),
  reminded_at timestamptz,
  primary key (user_id, auction_id)
);

comment on table public.auction_watches is
  'Auctions a member watches; reminded_at is set once they have been told it ends within a day.';

create index auction_watches_auction_idx on public.auction_watches (auction_id);

alter table public.auction_watches enable row level security;

create policy "Members see their watches" on public.auction_watches
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members watch live auctions" on public.auction_watches
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.auctions a
      where a.id = auction_id and a.status = 'live' and a.ends_at > now()
    )
  );

create policy "Members stop watching" on public.auction_watches
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.auction_watches from anon, authenticated;
grant select, delete on public.auction_watches to authenticated;
grant insert (auction_id) on public.auction_watches to authenticated;

create function private.remind_auction_watchers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reminded integer;
begin
  with due as (
    select w.user_id, w.auction_id, a.number, a.current_price, a.ends_at,
      p.name_en, p.name_ar
    from public.auction_watches w
    join public.auctions a on a.id = w.auction_id
    join public.products p on p.id = a.product_id
    where w.reminded_at is null
      and a.status = 'live'
      and a.ends_at > now()
      and a.ends_at <= now() + interval '24 hours'
      and not exists (
        select 1 from public.bids b
        where b.auction_id = w.auction_id and b.bidder_id = w.user_id and b.winning
      )
  ),
  told as (
    select private.notify(
      due.user_id, 'order', 'auction_ending',
      jsonb_build_object(
        'auction_id', due.auction_id, 'amount', due.current_price,
        'ends_at', due.ends_at, 'name_en', due.name_en, 'name_ar', due.name_ar
      ),
      '/store/auctions/' || due.number
    ), due.user_id, due.auction_id
    from due
  )
  update public.auction_watches w set reminded_at = now()
  from told
  where w.user_id = told.user_id and w.auction_id = told.auction_id;
  get diagnostics reminded = row_count;
  return reminded;
end;
$$;

create function public.remind_auction_watchers()
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.remind_auction_watchers() $$;

revoke all on function private.remind_auction_watchers() from public, anon, authenticated;
revoke all on function public.remind_auction_watchers() from public, anon, authenticated;
grant execute on function private.remind_auction_watchers() to service_role;
grant execute on function public.remind_auction_watchers() to service_role;
