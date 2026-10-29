-- Supply (28 October brief, step 13): Partners → Supply is a section an
-- organization adds from Home, like Selling (`organizations.features`).

alter table public.organizations drop constraint organizations_features_check;
alter table public.organizations add constraint organizations_features_check
  check (features <@ array['perks', 'team', 'developers', 'selling', 'supply']::text[]);
