-- Opportunities, part 3 (step 14.1): Club → Join names who runs each
-- opportunity, but visitors can't read organizations. `host_name` keeps
-- the organization's name on the opportunity (null for The IDEA's own),
-- set by the database on every write and when the organization is renamed.

alter table public.opportunities
  add column host_name text check (char_length(host_name) <= 200);

comment on column public.opportunities.host_name is
  'The organization running it, as listed (null: The IDEA). Kept in step with organizations.name.';

update public.opportunities o set host_name = g.name
from public.organizations g
where g.id = o.organization_id;

-- Always the organization's own name: nobody types it.
create function private.set_opportunity_host()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.host_name := (
    select g.name from public.organizations g where g.id = new.organization_id
  );
  return new;
end;
$$;

create trigger set_opportunity_host before insert or update on public.opportunities
  for each row execute function private.set_opportunity_host();

create function private.rename_opportunity_hosts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.opportunities set host_name = new.name
  where organization_id = new.id and host_name is distinct from new.name;
  return null;
end;
$$;

create trigger rename_opportunity_hosts after update of name on public.organizations
  for each row when (new.name is distinct from old.name)
  execute function private.rename_opportunity_hosts();

revoke all on function private.set_opportunity_host() from public, anon, authenticated;
revoke all on function private.rename_opportunity_hosts() from public, anon, authenticated;
