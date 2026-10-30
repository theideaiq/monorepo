-- Apple Wallet: The IDEA Pass card in Apple Wallet.
--
-- Apple Wallet can't work out a new code every 30 seconds the way the
-- website, the iOS/Android apps and Google Wallet do, so its card carries a
-- fixed code instead: `IDEA:<member number>:W<30 hex digits>`. Only a hash
-- of it is kept. Adding the card again issues a new code and the card
-- already in Apple Wallet stops working; the member can also turn it off
-- in Pass settings. `check_pass()` (the counter) and `pass_holder()`
-- (perks and partners' card checks) accept it, and `check_pass()` now says
-- which kind of card was scanned, so the counter knows a fixed code was
-- shown.

-- ── Wallet cards ───────────────────────────────────────────────────────────

create table private.wallet_cards (
  user_id uuid primary key references auth.users (id) on delete cascade,
  token_hash bytea not null,
  -- The pass's serial number in Apple Wallet; a new one with each code.
  serial uuid not null default gen_random_uuid(),
  issued_at timestamptz not null default now()
);

comment on table private.wallet_cards is
  'The IDEA Pass cards in Apple Wallet: one per member, a hash of its fixed code.';

-- No client role reaches the private schema; RLS for the structure check.
alter table private.wallet_cards enable row level security;

create policy "No client access" on private.wallet_cards
  as restrictive for all to anon, authenticated
  using (false);

-- A new Apple Wallet card for the caller: its member number, serial number
-- and fixed code (shown once, to sign the pass). The one before stops
-- working.
create function private.issue_wallet_card()
returns table (member_number bigint, serial uuid, token text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  member public.profiles;
  fresh text := encode(extensions.gen_random_bytes(15), 'hex');
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into member from public.profiles p where p.id = caller;
  if member.id is null or member.banned_at is not null then
    raise exception 'This Pass is suspended' using errcode = 'insufficient_privilege';
  end if;

  insert into private.wallet_cards (user_id, token_hash)
  values (caller, extensions.digest(fresh, 'sha256'))
  on conflict (user_id) do update
    set token_hash = excluded.token_hash,
        serial = gen_random_uuid(),
        issued_at = now();

  return query
  select member.member_number, w.serial, fresh
  from private.wallet_cards w
  where w.user_id = caller;
end;
$$;

create function public.issue_wallet_card()
returns table (member_number bigint, serial uuid, token text)
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.issue_wallet_card() $$;

comment on function public.issue_wallet_card() is
  'A new Apple Wallet card for the caller (member number, serial, fixed code shown once); the one before stops working.';

-- When the caller's Apple Wallet card was issued (null: none).
create function private.my_wallet_card()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select w.issued_at from private.wallet_cards w where w.user_id = (select auth.uid())
$$;

create function public.my_wallet_card()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$ select private.my_wallet_card() $$;

comment on function public.my_wallet_card() is
  'When the caller''s Apple Wallet card was issued, or null.';

-- Turns the caller's Apple Wallet card off.
create function private.remove_wallet_card()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from private.wallet_cards w where w.user_id = (select auth.uid())
$$;

create function public.remove_wallet_card()
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.remove_wallet_card() $$;

comment on function public.remove_wallet_card() is
  'Turns the caller''s Apple Wallet card off; its code stops working.';

-- ── Reading a scanned card ─────────────────────────────────────────────────

-- Whose card a scan is, and which kind: 'live' (the 30-second code, current
-- give or take one step) or 'wallet' (an Apple Wallet card's fixed code).
-- Null when it matches no card or the Pass is suspended.
create function private.scanned_card(scanned text, out holder uuid, out kind text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := regexp_match(
    trim(coalesce(scanned, '')),
    '^IDEA:([0-9]{1,18}):([0-9]{6}|W[0-9a-f]{30})$'
  );
  member public.profiles;
  seed bytea;
  now_step bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  if parts is null then
    return;
  end if;
  select * into member from public.profiles p where p.member_number = parts[1]::bigint;
  if member.id is null or member.banned_at is not null then
    return;
  end if;

  if left(parts[2], 1) = 'W' then
    if exists (
      select 1 from private.wallet_cards w
      where w.user_id = member.id
        and w.token_hash = extensions.digest(substr(parts[2], 2), 'sha256')
    ) then
      holder := member.id;
      kind := 'wallet';
    end if;
    return;
  end if;

  select s.secret into seed from private.pass_secrets s where s.user_id = member.id;
  if seed is not null and parts[2] in (
    private.pass_code(seed, now_step - 1),
    private.pass_code(seed, now_step),
    private.pass_code(seed, now_step + 1)
  ) then
    holder := member.id;
    kind := 'live';
  end if;
end;
$$;

-- The holder of a scanned card, when it's valid (perks, partners' checks).
create or replace function private.pass_holder(scanned text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select (private.scanned_card(scanned)).holder $$;

-- The counter's check gains `card`: which kind of card was scanned.
drop function public.check_pass(text);
drop function private.check_pass(text);

create function private.check_pass(scanned text)
returns table (
  valid boolean,
  user_id uuid,
  member_number bigint,
  full_name text,
  member_since timestamptz,
  card text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found record;
  member public.profiles;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Only support checks cards' using errcode = 'insufficient_privilege';
  end if;

  found := private.scanned_card(scanned);
  if found.holder is null then
    return query select false, null::uuid, null::bigint, null::text, null::timestamptz, null::text;
    return;
  end if;

  select * into member from public.profiles p where p.id = found.holder;
  return query select
    true, member.id, member.member_number, member.full_name, member.created_at, found.kind;
end;
$$;

create function public.check_pass(scanned text)
returns table (
  valid boolean,
  user_id uuid,
  member_number bigint,
  full_name text,
  member_since timestamptz,
  card text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.check_pass($1) $$;

comment on function public.check_pass(text) is
  'Checks a scanned The IDEA Pass card (IDEA:<member number>:<code>) at the counter (support staff, AAL2); card is live (30-second code) or wallet (Apple Wallet''s fixed code).';

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.scanned_card(text) from public, anon, authenticated;

revoke all on function private.issue_wallet_card() from public, anon;
grant execute on function private.issue_wallet_card() to authenticated;
revoke all on function public.issue_wallet_card() from public, anon;
grant execute on function public.issue_wallet_card() to authenticated;

revoke all on function private.my_wallet_card() from public, anon;
grant execute on function private.my_wallet_card() to authenticated;
revoke all on function public.my_wallet_card() from public, anon;
grant execute on function public.my_wallet_card() to authenticated;

revoke all on function private.remove_wallet_card() from public, anon;
grant execute on function private.remove_wallet_card() to authenticated;
revoke all on function public.remove_wallet_card() from public, anon;
grant execute on function public.remove_wallet_card() to authenticated;

revoke all on function private.check_pass(text) from public, anon;
grant execute on function private.check_pass(text) to authenticated, service_role;
revoke all on function public.check_pass(text) from public, anon;
grant execute on function public.check_pass(text) to authenticated, service_role;
