-- Plus features, part 4 (owner's master brief, step 12, section 17):
-- partner perks for Plus tiers, and paired perks.
--
-- * perks.plus_tiers aims a Plus perk at some tiers (1 Glow, 2 Shine,
--   3 Blaze); empty means every Plus member.
-- * perks.paired_with links two of a partner's perks ("10% for everyone",
--   "20% for Plus"); linking one links the other back.
-- * my_perks() lists the perks for the caller: each with whether it's
--   open to them; of a pair, the better one they get (the other hidden),
--   with the better one they don't get yet as `upgrade` ("With Plus: 20%").
--   Better means more exclusive: Plus over students over everyone.
-- * Partners' card check and redeem_perk follow the tiers.

alter table public.perks
  add column plus_tiers integer[],
  add column paired_with uuid references public.perks (id) on delete set null,
  add constraint perks_plus_tiers check (
    plus_tiers is null
    or (audience = 'plus' and cardinality(plus_tiers) > 0 and plus_tiers <@ '{1,2,3}'::integer[])
  ),
  add constraint perks_not_paired_with_itself check (paired_with is distinct from id);

comment on column public.perks.plus_tiers is
  'For a Plus perk, the tiers it is for (1 Glow, 2 Shine, 3 Blaze); null for every Plus member.';
comment on column public.perks.paired_with is
  'The partner''s other perk shown with this one (each shows the best one a person gets).';

create index perks_paired_with_idx on public.perks (paired_with);

-- Pairs are two perks of the same partner, linked both ways.
create function private.pair_perks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.paired_with is not distinct from old.paired_with then
    return null;
  end if;
  if new.paired_with is not null and not exists (
    select 1 from public.perks p
    where p.id = new.paired_with and p.organization_id = new.organization_id
  ) then
    raise exception 'Pair perks of the same partner' using errcode = 'check_violation';
  end if;
  -- Whatever pointed here before lets go; the new partner points back.
  update public.perks set paired_with = null
  where paired_with = new.id and id is distinct from new.paired_with;
  if new.paired_with is not null then
    update public.perks set paired_with = new.id
    where id = new.paired_with and paired_with is distinct from new.id;
  end if;
  return null;
end;
$$;

create trigger pair_perks after insert or update of paired_with on public.perks
  for each row execute function private.pair_perks();

-- Whether the member gets this perk: its audience and, for Plus, its tiers.
create function private.perk_open(member uuid, perk public.perks)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case perk.audience
    when 'plus' then private.plus_tier(member) > 0
      and (perk.plus_tiers is null or private.plus_tier(member) = any (perk.plus_tiers))
    else private.perk_open_to(member, perk.audience)
  end;
$$;

-- How exclusive a perk is, to pick the better of a pair.
create function private.perk_rank(perk public.perks)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case perk.audience when 'plus' then 2 when 'students' then 1 else 0 end
$$;

-- The perks on offer for the caller (anyone signed out sees them all, none
-- open): of a pair, the better one they get, the other as an upgrade.
create function private.my_perks()
returns table (
  id uuid,
  partner_name text,
  title_ar text,
  title_en text,
  details_ar text,
  details_en text,
  area_ar text,
  area_en text,
  audience text,
  plus_tiers integer[],
  open boolean,
  upgrade jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select k.*, private.perk_open((select auth.uid()), k) as open, private.perk_rank(k) as rank
    from public.perks k
    where k.active
  )
  select
    m.id, m.partner_name, m.title_ar, m.title_en, m.details_ar, m.details_en,
    m.area_ar, m.area_en, m.audience, m.plus_tiers, m.open,
    case when m.open and p.id is not null and not p.open and p.rank > m.rank then
      jsonb_build_object(
        'id', p.id,
        'title_ar', p.title_ar,
        'title_en', p.title_en,
        'audience', p.audience,
        'plus_tiers', p.plus_tiers
      )
    end
  from mine m
  left join mine p on p.id = m.paired_with
  -- Hidden when its pair is open to them and this one isn't, or is less.
  where not (p.id is not null and p.open and (not m.open or p.rank > m.rank))
  order by m.position, m.created_at;
$$;

create function public.my_perks()
returns table (
  id uuid,
  partner_name text,
  title_ar text,
  title_en text,
  details_ar text,
  details_en text,
  area_ar text,
  area_en text,
  audience text,
  plus_tiers integer[],
  open boolean,
  upgrade jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_perks() $$;

-- Partners check Pass cards: the perks open to the person follow tiers.
create or replace function private.partner_check(org uuid, scanned text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member uuid;
begin
  if not private.is_org_member(org) or not exists (select 1 from public.perks p where p.organization_id = org) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  member := private.pass_holder(scanned);
  if member is null then
    return jsonb_build_object('valid', false);
  end if;
  return jsonb_build_object(
    'valid', true,
    'first_name', private.first_name(member),
    'member_number', (select p.member_number from public.profiles p where p.id = member),
    'student', private.is_student(member),
    'plus', (private.member_plan(member)).id is not null,
    'perks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id,
        'title_ar', k.title_ar,
        'title_en', k.title_en,
        'audience', k.audience,
        'plus_tiers', k.plus_tiers,
        'open', private.perk_open(member, k),
        'used_today', exists (
          select 1 from public.perk_redemptions r
          where r.perk_id = k.id and r.user_id = member and r.redeemed_on = private.baghdad_today()
        )
      ) order by k.position, k.created_at)
      from public.perks k
      where k.organization_id = org and k.active
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.redeem_perk(perk uuid, scanned text)
returns public.perk_redemptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.perks;
  member uuid;
  saved public.perk_redemptions;
begin
  select * into target from public.perks p where p.id = perk and p.active;
  if target.id is null or not private.is_org_member(target.organization_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  member := private.pass_holder(scanned);
  if member is null then
    raise exception 'This card isn''t valid' using errcode = 'check_violation';
  end if;
  if not private.perk_open(member, target) then
    raise exception 'This perk isn''t open to them' using errcode = 'check_violation';
  end if;

  insert into public.perk_redemptions (perk_id, user_id, redeemed_by)
  values (target.id, member, (select auth.uid()))
  on conflict (perk_id, user_id, redeemed_on) do nothing
  returning * into saved;
  if saved.id is null then
    raise exception 'Already used today' using errcode = 'check_violation';
  end if;
  return saved;
end;
$$;

revoke all on function private.pair_perks() from public, anon, authenticated;
revoke all on function private.perk_open(uuid, public.perks) from public, anon, authenticated;
revoke all on function private.perk_rank(public.perks) from public, anon, authenticated;
revoke all on function private.my_perks() from public;
revoke all on function public.my_perks() from public;
grant execute on function private.my_perks() to anon, authenticated;
grant execute on function public.my_perks() to anon, authenticated;
