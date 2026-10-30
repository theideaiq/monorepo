-- Every sign-in method runs through Supabase Auth (owner, 30 Oct).
--
-- * Phone codes: a Pass proves a number with Supabase's phone change
--   (updateUser({ phone, channel }) then verifyOtp type "phone_change"),
--   delivered by Twilio Verify on WhatsApp or by SMS. Each number Supabase
--   confirms is kept in `verified_phones`, so the numbers a Pass verified
--   before stay verified when it verifies another.
-- * Telegram: the `custom:telegram` OIDC provider in Supabase Auth (signIn
--   or linkIdentity). Its identity links the Telegram account
--   (`telegram_members`, the 10-Bulb bonus once) and unlinking it
--   disconnects it. The Telegram user id comes from the ID token's `id`
--   claim (the provider's custom claims allowlist).
-- * Email once: a Pass starts with an email. A Telegram or phone identity
--   can only join a Pass that has one; signing up with Telegram or a phone
--   alone is refused, as before.

-- ── Verified phones ───────────────────────────────────────────────────────

create function private.keep_confirmed_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phone is not null and new.phone <> '' and new.phone_confirmed_at is not null
    and (tg_op = 'INSERT'
      or old.phone is distinct from new.phone
      or old.phone_confirmed_at is distinct from new.phone_confirmed_at)
    and ('+' || new.phone) ~ '^\+[1-9][0-9]{7,14}$'
  then
    insert into public.verified_phones (user_id, phone, verified_at)
    values (new.id, '+' || new.phone, new.phone_confirmed_at)
    on conflict (user_id, phone) do update set verified_at = excluded.verified_at;
  end if;
  return new;
end;
$$;

revoke all on function private.keep_confirmed_phone() from public, anon, authenticated;

create trigger keep_confirmed_phone
  after insert or update of phone, phone_confirmed_at on auth.users
  for each row execute function private.keep_confirmed_phone();

-- Numbers already confirmed by Supabase.
insert into public.verified_phones (user_id, phone, verified_at)
select u.id, '+' || u.phone, u.phone_confirmed_at
from auth.users u
where u.phone is not null and u.phone <> '' and u.phone_confirmed_at is not null
  and ('+' || u.phone) ~ '^\+[1-9][0-9]{7,14}$'
on conflict (user_id, phone) do nothing;

-- ── Email once ────────────────────────────────────────────────────────────

create function private.require_email_first()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.provider in ('custom:telegram', 'phone') and not exists (
    select 1 from auth.users u
    where u.id = new.user_id and coalesce(u.email, '') <> ''
  ) then
    raise exception 'Sign in with your email first'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function private.require_email_first() from public, anon, authenticated;

create trigger require_email_first
  before insert on auth.identities
  for each row execute function private.require_email_first();

-- ── Telegram ──────────────────────────────────────────────────────────────

create function private.sync_telegram_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims jsonb;
  telegram_id bigint;
begin
  if tg_op = 'DELETE' then
    if old.provider = 'custom:telegram' then
      update public.telegram_members set user_id = null where user_id = old.user_id;
    end if;
    return old;
  end if;

  if new.provider <> 'custom:telegram' then
    return new;
  end if;
  claims := coalesce(new.identity_data, '{}'::jsonb);
  telegram_id := case
    when coalesce(claims -> 'custom_claims' ->> 'id', claims ->> 'id') ~ '^[1-9][0-9]{0,18}$'
      then coalesce(claims -> 'custom_claims' ->> 'id', claims ->> 'id')::bigint
  end;
  -- Without the id claim (the provider's allowlist isn't set) the sign-in
  -- still works; the bot link waits for the next sign-in.
  if telegram_id is null then
    return new;
  end if;
  perform public.link_telegram(
    new.user_id,
    telegram_id,
    claims ->> 'preferred_username',
    coalesce(claims ->> 'given_name', claims ->> 'name'),
    claims ->> 'family_name'
  );
  return new;
end;
$$;

revoke all on function private.sync_telegram_identity() from public, anon, authenticated;

create trigger sync_telegram_identity
  after insert or update of identity_data or delete on auth.identities
  for each row execute function private.sync_telegram_identity();
