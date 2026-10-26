-- Program revision v1, step 1 (renames): The IDEA Academy is dropped and
-- The IDEA Suite is now The IDEA Business, so Droid's FAQ topics become
-- general, store, plus, club and business. Academy answers move to general.

alter table public.telegram_faq drop constraint telegram_faq_topic_check;

update public.telegram_faq set topic = 'general' where topic = 'academy';
update public.telegram_faq set topic = 'business' where topic = 'suite';

alter table public.telegram_faq
  add constraint telegram_faq_topic_check
  check (topic in ('general', 'store', 'plus', 'club', 'business'));

-- ── One address for invites and affiliate links ─────────────────────────────
-- theideaiq.com/r/<code> replaces /i/<code> (a friend's invite) and
-- /a/<code> (an affiliate's link). Invite codes are lower case and
-- affiliate codes upper case, but people retype links, so the page asks
-- which kind a code is. An approved affiliate wins if both match.

create function private.referral_kind(code text)
returns text
language sql stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.affiliates a
      where a.code = upper(trim(coalesce(referral_kind.code, ''))) and a.status = 'approved'
    ) then 'affiliate'
    when exists (
      select 1 from public.profiles p
      where p.invite_code = lower(trim(coalesce(referral_kind.code, ''))) and p.banned_at is null
    ) then 'invite'
  end
$$;

create function public.referral_kind(code text)
returns text
language sql stable
security invoker
set search_path = ''
as $$ select private.referral_kind(code) $$;

comment on function public.referral_kind(text) is
  'Whether /r/<code> is an approved affiliate''s code (affiliate), a member''s invite code (invite) or neither (null).';

revoke all on function private.referral_kind(text) from public;
grant execute on function private.referral_kind(text) to anon, authenticated, service_role;
revoke all on function public.referral_kind(text) from public;
grant execute on function public.referral_kind(text) to anon, authenticated, service_role;
