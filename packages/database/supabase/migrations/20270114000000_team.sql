-- Partners: Bulk buying and Plus seats become one section, Team
-- (owner decisions of 2026-10-28, part 2, section 5): bulk orders for the
-- organization, and Plus for its people (`plus_seats`).
--
-- Part 1, before the code: `team` becomes a section, and organizations
-- with Bulk buying or Plus seats get it. `bulk_buying` stays allowed until
-- the Partners screens move to /team; the migration that ships with them
-- removes it.

alter table public.organizations drop constraint organizations_features_check;
alter table public.organizations add constraint organizations_features_check
  check (features <@ array['perks', 'bulk_buying', 'team', 'developers', 'selling']::text[]);

update public.organizations o
set features = o.features || '{team}'
where not ('team' = any (o.features))
  and (
    'bulk_buying' = any (o.features)
    or exists (select 1 from public.plus_seats s where s.organization_id = o.id)
  );
