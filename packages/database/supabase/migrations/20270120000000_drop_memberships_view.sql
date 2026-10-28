-- The apps read public.organization_members now: the view that kept the
-- old name working during the rename goes.

drop view public.memberships;
