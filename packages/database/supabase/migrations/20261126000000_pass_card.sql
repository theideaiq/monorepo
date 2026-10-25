-- The IDEA Pass card: a member number and a code that changes every 30
-- seconds.
--
-- Each member gets a secret once (`my_pass_secret()`); the website and the
-- iOS/Android apps work out the code from it on the device every 30
-- seconds (TOTP, RFC 6238: HMAC-SHA1, 6 digits), so it works offline too,
-- and Google Wallet rotates the same code on its own. The card's QR code
-- carries `IDEA:<member number>:<code>`; staff check it at the counter with
-- `check_pass()`, which accepts the current code and the ones just before
-- and after (clock drift). A screenshot stops working within a minute.

-- ── Member numbers ─────────────────────────────────────────────────────────

alter table public.profiles
  add column member_number bigint generated always as identity (start with 100001) unique;

comment on column public.profiles.member_number is
  'The IDEA Pass member number, shown on the card (never reused).';

-- ── Secrets ────────────────────────────────────────────────────────────────

create table private.pass_secrets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  secret bytea not null default extensions.gen_random_bytes(20),
  created_at timestamptz not null default now()
);

comment on table private.pass_secrets is
  'The IDEA Pass card secrets (TOTP seeds); read only through my_pass_secret() and check_pass().';

-- No client role reaches the private schema; RLS for the structure check.
alter table private.pass_secrets enable row level security;

-- ── The code ───────────────────────────────────────────────────────────────

-- The 6-digit code for `secret` at 30-second step `step` (RFC 6238 TOTP
-- with HMAC-SHA1, as the website and Google Wallet compute it).
create function private.pass_code(secret bytea, step bigint)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  digest bytea;
  offset_at integer;
  bin bigint;
begin
  digest := extensions.hmac(decode(lpad(to_hex(step), 16, '0'), 'hex'), secret, 'sha1');
  offset_at := get_byte(digest, 19) & 15;
  bin := ((get_byte(digest, offset_at) & 127)::bigint << 24)
    | (get_byte(digest, offset_at + 1)::bigint << 16)
    | (get_byte(digest, offset_at + 2)::bigint << 8)
    | get_byte(digest, offset_at + 3)::bigint;
  return lpad((bin % 1000000)::text, 6, '0');
end;
$$;

-- The caller's member number and card secret (hex), creating the secret the
-- first time. The secret is the member's own, like an authenticator seed.
create function private.my_pass_secret()
returns table (member_number bigint, secret text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  insert into private.pass_secrets (user_id) values (caller)
  on conflict (user_id) do nothing;

  return query
  select p.member_number, encode(s.secret, 'hex')
  from public.profiles p
  join private.pass_secrets s on s.user_id = p.id
  where p.id = caller;
end;
$$;

create function public.my_pass_secret()
returns table (member_number bigint, secret text)
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.my_pass_secret() $$;

comment on function public.my_pass_secret() is
  'The caller''s The IDEA Pass member number and card secret (hex), created on first use.';

-- Staff at the counter check a scanned card (`IDEA:<member number>:<code>`):
-- whose it is, and whether the code is current. Support staff and admins on
-- an authenticator-app session only.
create function private.check_pass(scanned text)
returns table (
  valid boolean,
  user_id uuid,
  member_number bigint,
  full_name text,
  member_since timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[];
  member public.profiles;
  seed bytea;
  now_step bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Only support checks cards' using errcode = 'insufficient_privilege';
  end if;

  parts := regexp_match(trim(coalesce(scanned, '')), '^IDEA:([0-9]{1,18}):([0-9]{6})$');
  if parts is null then
    return query select false, null::uuid, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  select * into member from public.profiles p where p.member_number = parts[1]::bigint;
  select s.secret into seed from private.pass_secrets s where s.user_id = member.id;

  if member.id is null or seed is null then
    return query select false, null::uuid, null::bigint, null::text, null::timestamptz;
    return;
  end if;

  return query select
    parts[2] in (
      private.pass_code(seed, now_step - 1),
      private.pass_code(seed, now_step),
      private.pass_code(seed, now_step + 1)
    )
    and member.banned_at is null,
    member.id,
    member.member_number,
    member.full_name,
    member.created_at;
end;
$$;

create function public.check_pass(scanned text)
returns table (
  valid boolean,
  user_id uuid,
  member_number bigint,
  full_name text,
  member_since timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.check_pass($1) $$;

comment on function public.check_pass(text) is
  'Checks a scanned The IDEA Pass card (IDEA:<member number>:<code>) at the counter (support staff, AAL2).';

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.pass_code(bytea, bigint) from public, anon, authenticated;

revoke all on function private.my_pass_secret() from public, anon;
grant execute on function private.my_pass_secret() to authenticated, service_role;
revoke all on function public.my_pass_secret() from public, anon;
grant execute on function public.my_pass_secret() to authenticated, service_role;

revoke all on function private.check_pass(text) from public, anon;
grant execute on function private.check_pass(text) to authenticated, service_role;
revoke all on function public.check_pass(text) from public, anon;
grant execute on function public.check_pass(text) to authenticated, service_role;
