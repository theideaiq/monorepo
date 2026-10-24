-- Production hardening: the Supabase advisor at zero. Each section matches a
-- check in tests/database/00_advisors.test.sql.
--
-- 1. Every foreign key has an index on its columns (advisor 0001), so
--    deletes on the referenced table and joins along the key do not scan.
-- 2. One permissive policy per table, role and action (advisor 0006).
-- 3. No SECURITY DEFINER function in public is callable by anon or
--    authenticated (advisors 0028, 0029). The bodies move to private with
--    their owner's rights, names, grants and permission checks; each public
--    name becomes a SECURITY INVOKER wrapper with the same signature and
--    defaults, so the apps, PostgREST and the generated types do not change.
--    Policies and triggers that used a moved function follow it (they refer
--    to it by oid).

-- ── 1. Indexes on foreign keys (advisor 0001) ─────────────────────────────
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index cart_items_product_id_idx on public.cart_items (product_id);
create index cart_items_variant_id_idx on public.cart_items (variant_id);
create index crm_contacts_updated_by_idx on public.crm_contacts (updated_by);
create index equity_holders_round_id_idx on public.equity_holders (round_id);
create index events_created_by_idx on public.events (created_by);
create index invitations_invited_by_idx on public.invitations (invited_by);
create index ledger_entries_created_by_idx on public.ledger_entries (created_by);
create index marketing_campaigns_created_by_idx on public.marketing_campaigns (created_by);
create index marketing_campaigns_segment_id_idx on public.marketing_campaigns (segment_id);
create index marketing_segments_created_by_idx on public.marketing_segments (created_by);
create index order_items_product_id_idx on public.order_items (product_id);
create index order_items_variant_id_idx on public.order_items (variant_id);
create index organizations_created_by_idx on public.organizations (created_by);
create index posts_author_id_idx on public.posts (author_id);
create index product_reviews_user_id_idx on public.product_reviews (user_id);
create index products_category_id_idx on public.products (category_id);
create index projects_created_by_idx on public.projects (created_by);
create index rentals_product_id_idx on public.rentals (product_id);
create index staff_granted_by_idx on public.staff (granted_by);
create index submission_reviews_reviewed_by_idx on public.submission_reviews (reviewed_by);
create index submissions_assigned_to_idx on public.submissions (assigned_to);
create index subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index support_messages_author_id_idx on public.support_messages (author_id);
create index support_tickets_assigned_to_idx on public.support_tickets (assigned_to);
create index support_tickets_order_id_idx on public.support_tickets (order_id);
create index telegram_requests_member_id_idx on public.telegram_requests (member_id);
create index telegram_requests_resolved_by_idx on public.telegram_requests (resolved_by);

-- ── 2. One permissive policy per table, role and action (advisor 0006) ─────
-- Postgres evaluates every permissive policy for a row, so overlapping
-- policies are merged into one whose expression is the OR of the originals.
-- Restrictive policies are untouched, so the rules stay the same. Helper
-- calls that do not depend on the row are wrapped in a sub-select so they
-- run once per statement.

-- chart_of_accounts: the read policy repeated the manage policy.
drop policy "Finance reads the chart of accounts" on public.chart_of_accounts;
drop policy "Finance manages the chart of accounts" on public.chart_of_accounts;
create policy "Finance reads the chart of accounts"
  on public.chart_of_accounts for select to authenticated
  using ((select private.has_staff_role('{finance}')));
create policy "Finance adds accounts"
  on public.chart_of_accounts for insert to authenticated
  with check ((select private.has_staff_role('{finance}')));
create policy "Finance edits accounts"
  on public.chart_of_accounts for update to authenticated
  using ((select private.has_staff_role('{finance}')))
  with check ((select private.has_staff_role('{finance}')));
create policy "Finance removes accounts"
  on public.chart_of_accounts for delete to authenticated
  using ((select private.has_staff_role('{finance}')));

-- crm_contacts: the same.
drop policy "Support and marketing see CRM contacts" on public.crm_contacts;
drop policy "Support and marketing edit CRM contacts" on public.crm_contacts;
create policy "Support and marketing see CRM contacts"
  on public.crm_contacts for select to authenticated
  using ((select private.has_staff_role('{support,marketing}')));
create policy "Support and marketing add CRM contacts"
  on public.crm_contacts for insert to authenticated
  with check ((select private.has_staff_role('{support,marketing}')));
create policy "Support and marketing edit CRM contacts"
  on public.crm_contacts for update to authenticated
  using ((select private.has_staff_role('{support,marketing}')))
  with check ((select private.has_staff_role('{support,marketing}')));
create policy "Support and marketing remove CRM contacts"
  on public.crm_contacts for delete to authenticated
  using ((select private.has_staff_role('{support,marketing}')));

-- payments: owners and admins of the paying organization, the paying user,
-- and finance.
drop policy "Owners and admins see payments" on public.payments;
drop policy "Users see their own payments" on public.payments;
create policy "Payers, their organization's admins and finance see payments"
  on public.payments for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_org_role(organization_id, '{owner,admin}')
    or (select private.has_staff_role('{finance}'))
  );

-- plans: visitors see active plans; signed-in users also see every plan if
-- they are staff, and admins manage them.
drop policy "Active plans are public" on public.plans;
drop policy "Staff see every plan" on public.plans;
drop policy "Admins manage plans" on public.plans;
create policy "Visitors see active plans"
  on public.plans for select to anon
  using (active);
create policy "Users see active plans, staff see every plan"
  on public.plans for select to authenticated
  using (
    active
    or (select private.is_staff())
    or (select private.has_staff_role('{admin}'))
  );
create policy "Admins add plans"
  on public.plans for insert to authenticated
  with check ((select private.has_staff_role('{admin}')));
create policy "Admins edit plans"
  on public.plans for update to authenticated
  using ((select private.has_staff_role('{admin}')))
  with check ((select private.has_staff_role('{admin}')));
create policy "Admins remove plans"
  on public.plans for delete to authenticated
  using ((select private.has_staff_role('{admin}')));

-- profiles: one read policy (self, teammates, staff) and one update policy
-- (self, or support suspending a customer).
drop policy "Profiles are visible to the user and their teammates" on public.profiles;
drop policy "Staff see every profile" on public.profiles;
create policy "Users, their teammates and staff see profiles"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or private.shares_org_with(id)
    or (select private.is_staff())
  );
drop policy "Users update their own profile" on public.profiles;
drop policy "Support suspends customers" on public.profiles;
create policy "Users update their own profile, support suspends customers"
  on public.profiles for update to authenticated
  using (
    id = (select auth.uid())
    or (select private.has_staff_role('{support}'))
  )
  with check (
    id = (select auth.uid())
    or (select private.has_staff_role('{support}'))
  );

-- subscriptions: the subscriber, members of the subscribing organization,
-- support and finance.
drop policy "Users see their own subscription" on public.subscriptions;
drop policy "Members see their organization's subscription" on public.subscriptions;
create policy "Subscribers, their organization and staff see subscriptions"
  on public.subscriptions for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_org_member(organization_id)
    or (select private.has_staff_role('{support,finance}'))
  );

-- ── 3. RPC bodies in private, SECURITY INVOKER wrappers in public ─────────
-- (advisors 0028, 0029). complete_order_payment and mark_overdue_rentals stay
-- where they are: only the service role may call them. The private bodies
-- keep their grants (anon, authenticated and service_role have usage on
-- private); private is not exposed through the Data API.

-- public.accept_invitation
alter function public.accept_invitation(invitation_token uuid) set schema private;
create function public.accept_invitation(invitation_token uuid)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.accept_invitation($1) $$;
revoke all on function public.accept_invitation(invitation_token uuid) from public, anon, authenticated, service_role;
grant execute on function public.accept_invitation(invitation_token uuid) to authenticated;
grant execute on function public.accept_invitation(invitation_token uuid) to service_role;

-- public.cancel_order
alter function public.cancel_order(order_id uuid) set schema private;
create function public.cancel_order(order_id uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.cancel_order($1) $$;
revoke all on function public.cancel_order(order_id uuid) from public, anon, authenticated, service_role;
grant execute on function public.cancel_order(order_id uuid) to authenticated;
grant execute on function public.cancel_order(order_id uuid) to service_role;

-- public.cancel_rental
alter function public.cancel_rental(rental uuid) set schema private;
create function public.cancel_rental(rental uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.cancel_rental($1) $$;
revoke all on function public.cancel_rental(rental uuid) from public, anon, authenticated, service_role;
grant execute on function public.cancel_rental(rental uuid) to authenticated;
grant execute on function public.cancel_rental(rental uuid) to service_role;

-- public.close_support_ticket
alter function public.close_support_ticket(ticket uuid) set schema private;
create function public.close_support_ticket(ticket uuid)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.close_support_ticket($1) $$;
revoke all on function public.close_support_ticket(ticket uuid) from public, anon, authenticated, service_role;
grant execute on function public.close_support_ticket(ticket uuid) to authenticated;
grant execute on function public.close_support_ticket(ticket uuid) to service_role;

-- public.create_order
alter function public.create_order(shipping jsonb) set schema private;
create function public.create_order(shipping jsonb)
returns public.orders
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.create_order($1) $$;
revoke all on function public.create_order(shipping jsonb) from public, anon, authenticated, service_role;
grant execute on function public.create_order(shipping jsonb) to authenticated;
grant execute on function public.create_order(shipping jsonb) to service_role;

-- public.create_organization
alter function public.create_organization(org_name text, org_slug text) set schema private;
create function public.create_organization(org_name text, org_slug text)
returns public.organizations
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.create_organization($1, $2) $$;
revoke all on function public.create_organization(org_name text, org_slug text) from public, anon, authenticated, service_role;
grant execute on function public.create_organization(org_name text, org_slug text) to authenticated;
grant execute on function public.create_organization(org_name text, org_slug text) to service_role;

-- public.create_support_ticket
alter function public.create_support_ticket(ticket_subject text, ticket_body text, ticket_topic public.ticket_topic, ticket_order uuid) set schema private;
create function public.create_support_ticket(ticket_subject text, ticket_body text, ticket_topic public.ticket_topic DEFAULT 'other'::public.ticket_topic, ticket_order uuid DEFAULT NULL::uuid)
returns public.support_tickets
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.create_support_ticket($1, $2, $3, $4) $$;
revoke all on function public.create_support_ticket(ticket_subject text, ticket_body text, ticket_topic public.ticket_topic, ticket_order uuid) from public, anon, authenticated, service_role;
grant execute on function public.create_support_ticket(ticket_subject text, ticket_body text, ticket_topic public.ticket_topic, ticket_order uuid) to authenticated;
grant execute on function public.create_support_ticket(ticket_subject text, ticket_body text, ticket_topic public.ticket_topic, ticket_order uuid) to service_role;

-- public.event_rsvp_count
alter function public.event_rsvp_count(event uuid) set schema private;
create function public.event_rsvp_count(event uuid)
returns bigint
language sql stable
security invoker
set search_path = ''
as $$ select private.event_rsvp_count($1) $$;
revoke all on function public.event_rsvp_count(event uuid) from public, anon, authenticated, service_role;
grant execute on function public.event_rsvp_count(event uuid) to anon;
grant execute on function public.event_rsvp_count(event uuid) to authenticated;
grant execute on function public.event_rsvp_count(event uuid) to service_role;

-- public.fixed_asset_schedule
alter function public.fixed_asset_schedule(as_of date) set schema private;
create function public.fixed_asset_schedule(as_of date DEFAULT CURRENT_DATE)
returns TABLE(id uuid, name text, category text, purchase_date date, cost bigint, monthly_depreciation bigint, months_elapsed integer, accumulated_depreciation bigint, book_value bigint, disposed_on date)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.fixed_asset_schedule($1) $$;
revoke all on function public.fixed_asset_schedule(as_of date) from public, anon, authenticated, service_role;
grant execute on function public.fixed_asset_schedule(as_of date) to authenticated;
grant execute on function public.fixed_asset_schedule(as_of date) to service_role;

-- public.ledger_monthly_summary
alter function public.ledger_monthly_summary(from_date date, to_date date, summary_scenario public.ledger_scenario) set schema private;
create function public.ledger_monthly_summary(from_date date, to_date date, summary_scenario public.ledger_scenario DEFAULT 'actual'::public.ledger_scenario)
returns TABLE(month date, revenue bigint, expenses bigint, cogs bigint)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.ledger_monthly_summary($1, $2, $3) $$;
revoke all on function public.ledger_monthly_summary(from_date date, to_date date, summary_scenario public.ledger_scenario) from public, anon, authenticated, service_role;
grant execute on function public.ledger_monthly_summary(from_date date, to_date date, summary_scenario public.ledger_scenario) to authenticated;
grant execute on function public.ledger_monthly_summary(from_date date, to_date date, summary_scenario public.ledger_scenario) to service_role;

-- public.mark_notifications_read
alter function public.mark_notifications_read(notification_ids uuid[]) set schema private;
create function public.mark_notifications_read(notification_ids uuid[] DEFAULT NULL::uuid[])
returns integer
language sql volatile
security invoker
set search_path = ''
as $$ select private.mark_notifications_read($1) $$;
revoke all on function public.mark_notifications_read(notification_ids uuid[]) from public, anon, authenticated, service_role;
grant execute on function public.mark_notifications_read(notification_ids uuid[]) to authenticated;
grant execute on function public.mark_notifications_read(notification_ids uuid[]) to service_role;

-- public.my_calendar_token
alter function public.my_calendar_token() set schema private;
create function public.my_calendar_token()
returns uuid
language sql stable
security invoker
set search_path = ''
as $$ select private.my_calendar_token() $$;
revoke all on function public.my_calendar_token() from public, anon, authenticated, service_role;
grant execute on function public.my_calendar_token() to authenticated;
grant execute on function public.my_calendar_token() to service_role;

-- public.my_rental_allowance
alter function public.my_rental_allowance() set schema private;
create function public.my_rental_allowance()
returns TABLE(slots integer, in_use integer, tier integer)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.my_rental_allowance() $$;
revoke all on function public.my_rental_allowance() from public, anon, authenticated, service_role;
grant execute on function public.my_rental_allowance() to authenticated;
grant execute on function public.my_rental_allowance() to service_role;

-- public.pending_invitations
alter function public.pending_invitations() set schema private;
create function public.pending_invitations()
returns TABLE(token uuid, organization_id uuid, organization_name text, role public.org_role, expires_at timestamp with time zone)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.pending_invitations() $$;
revoke all on function public.pending_invitations() from public, anon, authenticated, service_role;
grant execute on function public.pending_invitations() to authenticated;
grant execute on function public.pending_invitations() to service_role;

-- public.post_journal_entry
alter function public.post_journal_entry(entry_date date, description text, lines jsonb, reference text, scenario public.ledger_scenario, currency character, exchange_rate numeric) set schema private;
create function public.post_journal_entry(entry_date date, description text, lines jsonb, reference text DEFAULT NULL::text, scenario public.ledger_scenario DEFAULT 'actual'::public.ledger_scenario, currency character DEFAULT 'IQD'::bpchar, exchange_rate numeric DEFAULT 1)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.post_journal_entry($1, $2, $3, $4, $5, $6, $7) $$;
revoke all on function public.post_journal_entry(entry_date date, description text, lines jsonb, reference text, scenario public.ledger_scenario, currency character, exchange_rate numeric) from public, anon, authenticated, service_role;
grant execute on function public.post_journal_entry(entry_date date, description text, lines jsonb, reference text, scenario public.ledger_scenario, currency character, exchange_rate numeric) to authenticated;
grant execute on function public.post_journal_entry(entry_date date, description text, lines jsonb, reference text, scenario public.ledger_scenario, currency character, exchange_rate numeric) to service_role;

-- public.product_review_list
alter function public.product_review_list(review_product uuid, max_rows integer, skip integer) set schema private;
create function public.product_review_list(review_product uuid, max_rows integer DEFAULT 20, skip integer DEFAULT 0)
returns TABLE(id uuid, rating smallint, comment text, verified_purchase boolean, created_at timestamp with time zone, author_name text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.product_review_list($1, $2, $3) $$;
revoke all on function public.product_review_list(review_product uuid, max_rows integer, skip integer) from public, anon, authenticated, service_role;
grant execute on function public.product_review_list(review_product uuid, max_rows integer, skip integer) to anon;
grant execute on function public.product_review_list(review_product uuid, max_rows integer, skip integer) to authenticated;
grant execute on function public.product_review_list(review_product uuid, max_rows integer, skip integer) to service_role;

-- public.request_rental
alter function public.request_rental(rental_product uuid) set schema private;
create function public.request_rental(rental_product uuid)
returns public.rentals
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.request_rental($1) $$;
revoke all on function public.request_rental(rental_product uuid) from public, anon, authenticated, service_role;
grant execute on function public.request_rental(rental_product uuid) to authenticated;
grant execute on function public.request_rental(rental_product uuid) to service_role;

-- public.review_queue
alter function public.review_queue() set schema private;
create function public.review_queue()
returns TABLE(id uuid, title text, type public.submission_type, status public.submission_status, assigned_to uuid, submitted_at timestamp with time zone, author_id uuid, author_name text)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.review_queue() $$;
revoke all on function public.review_queue() from public, anon, authenticated, service_role;
grant execute on function public.review_queue() to authenticated;
grant execute on function public.review_queue() to service_role;

-- public.rotate_calendar_token
alter function public.rotate_calendar_token() set schema private;
create function public.rotate_calendar_token()
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.rotate_calendar_token() $$;
revoke all on function public.rotate_calendar_token() from public, anon, authenticated, service_role;
grant execute on function public.rotate_calendar_token() to authenticated;
grant execute on function public.rotate_calendar_token() to service_role;

-- public.set_staff_role
alter function public.set_staff_role(target uuid, new_role public.staff_role, staff_title text) set schema private;
create function public.set_staff_role(target uuid, new_role public.staff_role, staff_title text DEFAULT NULL::text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.set_staff_role($1, $2, $3) $$;
revoke all on function public.set_staff_role(target uuid, new_role public.staff_role, staff_title text) from public, anon, authenticated, service_role;
grant execute on function public.set_staff_role(target uuid, new_role public.staff_role, staff_title text) to authenticated;
grant execute on function public.set_staff_role(target uuid, new_role public.staff_role, staff_title text) to service_role;

