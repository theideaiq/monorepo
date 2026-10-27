-- The IDEA Partners: the sections an organization has switched on.
--
-- Partners shows Home and Organization to every organization; the other
-- sections appear once the organization adds them from Home (owners and
-- admins). Selling, Supply and Opportunities join this list when they
-- ship.

alter table public.organizations
  add column features text[] not null default '{}'
    check (features <@ array['perks', 'bulk_buying', 'developers']::text[]);

comment on column public.organizations.features is
  'Sections of The IDEA Partners the organization has switched on.';

-- Each section once, in a stable order.
create function private.normalize_organization_features()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.features := coalesce(
    (select array_agg(distinct feature order by feature) from unnest(new.features) feature),
    '{}'
  );
  return new;
end;
$$;

create trigger normalize_features
  before insert or update of features on public.organizations
  for each row execute function private.normalize_organization_features();

-- Owners and admins switch sections on and off (the update policy already
-- limits rows to them).
grant update (features) on public.organizations to authenticated;

-- Organizations already using a section keep it.
update public.organizations o
set features = array_remove(array[
  case when exists (select 1 from public.perks p where p.organization_id = o.id)
    then 'perks' end,
  case when exists (select 1 from public.procurement_requests r where r.organization_id = o.id)
    then 'bulk_buying' end,
  case when exists (select 1 from public.pass_partners a where a.organization_id = o.id)
      or exists (select 1 from public.pass_partner_domains d where d.organization_id = o.id)
    then 'developers' end
], null);

-- Staff adding an organization's first perk switches Perks on for it.
create function private.perk_switches_on_perks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.organizations
  set features = features || '{perks}'
  where id = new.organization_id and not ('perks' = any (features));
  return null;
end;
$$;

revoke all on function private.normalize_organization_features() from public, anon, authenticated;
revoke all on function private.perk_switches_on_perks() from public, anon, authenticated;

create trigger switch_on_perks
  after insert on public.perks
  for each row execute function private.perk_switches_on_perks();
