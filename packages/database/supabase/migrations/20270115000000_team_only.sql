-- Team, part 2 (with the screens at /team): `bulk_buying` is no longer a
-- section of Partners; Team took its place (20270114000000).

update public.organizations
set features = array_remove(features, 'bulk_buying')
where 'bulk_buying' = any (features);

alter table public.organizations drop constraint organizations_features_check;
alter table public.organizations add constraint organizations_features_check
  check (features <@ array['perks', 'team', 'developers', 'selling']::text[]);
