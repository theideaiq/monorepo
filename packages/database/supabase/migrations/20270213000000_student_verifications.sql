-- Student verification for partners: a separate service, SheerID-style.
-- The IDEA's own student badge (`student_badges`) is unchanged.
--
-- * A partner's backend starts a verification with its Sign in with The
--   IDEA Pass app credentials (apps/api, `create_student_verification`)
--   and sends the student to theideaiq.com/verify/<id>, which sends them
--   back to the partner's return address afterwards.
-- * A Pass holder with a valid student badge shares it in one tap
--   (`share_student_verification`). Anyone else, with or without a Pass,
--   verifies with their university email and an emailed 8-digit code
--   (`start_student_verification_email`, then
--   `confirm_student_verification_email`), or with a document: a student
--   card or enrollment proof dated within 3 months, which Staff review in
--   the Inbox (`review_student_verification`) and delete afterwards.
-- * One verification per partner per person (the email, or the Pass),
--   valid until 30 June; each academic year needs a new one. Nothing is
--   shared across partners: another partner needs its own verification.
-- * Partners read only the status, the university and the expiry date
--   (the API, and a webhook to `pass_partners.webhook_url` on each change,
--   queued in `partner_webhook_events`).
-- * The confirmation email links to deleting the verification
--   (`delete_student_verification`), which tells the partner too.
-- * Everything here but Staff's review and the page's view is reached
--   only by apps/api with the service role.

-- ── Webhooks ───────────────────────────────────────────────────────────────

alter table public.pass_partners
  add column webhook_url text check (webhook_url ~ '^https://[^\s]+$' and char_length(webhook_url) <= 500);

comment on column public.pass_partners.webhook_url is
  'Where The IDEA posts the app''s events (student verifications), signed with The IDEA''s keys (the JWKS).';

create table public.partner_webhook_events (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.pass_partners (client_id) on delete cascade,
  type text not null check (type ~ '^[a-z_]+\.[a-z_]+$'),
  payload jsonb not null,
  attempts smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  claimed_until timestamptz,
  delivered_at timestamptz,
  last_error text check (char_length(last_error) <= 500),
  created_at timestamptz not null default now()
);

comment on table public.partner_webhook_events is
  'Events waiting to be (or already) posted to a partner app''s webhook. Service only.';

create index partner_webhook_events_client_idx on public.partner_webhook_events (client_id, created_at desc);
create index partner_webhook_events_due_idx on public.partner_webhook_events (next_attempt_at)
  where delivered_at is null;

alter table public.partner_webhook_events enable row level security;

create policy "No client access" on public.partner_webhook_events
  as restrictive for all to anon, authenticated using (false);

-- An org admin sets (or clears) the app's webhook: https, on a verified
-- domain of the organization.
create function private.set_pass_app_webhook(client text, url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.pass_partners := private.managed_pass_app(client);
  clean text := nullif(trim(coalesce(url, '')), '');
begin
  if clean is not null and (
    clean !~ '^https://[^\s]+$'
    or not private.pass_host_verified(app.organization_id, private.url_host(clean))
  ) then
    raise exception 'The webhook isn''t on a verified domain' using errcode = 'check_violation';
  end if;
  update public.pass_partners set webhook_url = clean where client_id = app.client_id;
  return clean;
end;
$$;

create function public.set_pass_app_webhook(client text, url text)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.set_pass_app_webhook(client, url) $$;

revoke all on function private.set_pass_app_webhook(text, text) from public, anon;
revoke all on function public.set_pass_app_webhook(text, text) from public, anon;
grant execute on function private.set_pass_app_webhook(text, text) to authenticated;
grant execute on function public.set_pass_app_webhook(text, text) to authenticated;

-- The organization's apps and their webhooks, for Partners → Developers.
create function private.pass_app_webhooks(org uuid)
returns table (client_id text, webhook_url text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_org_role(org, '{owner,admin}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
  select p.client_id, p.webhook_url from public.pass_partners p where p.organization_id = org;
end;
$$;

create function public.pass_app_webhooks(org uuid)
returns table (client_id text, webhook_url text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.pass_app_webhooks(org) $$;

revoke all on function private.pass_app_webhooks(uuid) from public, anon;
revoke all on function public.pass_app_webhooks(uuid) from public, anon;
grant execute on function private.pass_app_webhooks(uuid) to authenticated;
grant execute on function public.pass_app_webhooks(uuid) to authenticated;

-- apps/api takes the events due (claimed for 5 minutes so none is sent
-- twice at once), with where to send them.
create function public.claim_partner_webhooks(max_rows integer default 20)
returns table (id uuid, client_id text, type text, payload jsonb, url text, attempts smallint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select e.id from public.partner_webhook_events e
    join public.pass_partners p on p.client_id = e.client_id
    where e.delivered_at is null
      and e.next_attempt_at <= now()
      and (e.claimed_until is null or e.claimed_until < now())
      and p.webhook_url is not null and p.active
    order by e.next_attempt_at
    limit greatest(1, least(max_rows, 100))
    for update of e skip locked
  )
  update public.partner_webhook_events e set claimed_until = now() + interval '5 minutes'
  from due, public.pass_partners p
  where e.id = due.id and p.client_id = e.client_id
  returning e.id, e.client_id, e.type, e.payload, p.webhook_url, e.attempts;
end;
$$;

-- Delivered, or retried later (1 minute, then doubling, up to a day);
-- after 10 tries it stops.
create function public.finish_partner_webhook(target uuid, delivered boolean, error text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.partner_webhook_events set
    claimed_until = null,
    delivered_at = case when delivered then now() end,
    attempts = attempts + 1,
    last_error = case when delivered then null else left(error, 500) end,
    next_attempt_at = case when delivered then next_attempt_at
      when attempts + 1 >= 10 then 'infinity'::timestamptz
      else now() + least(interval '1 day', interval '1 minute' * power(2, attempts)) end
  where id = target;
$$;

revoke all on function public.claim_partner_webhooks(integer) from public, anon, authenticated;
revoke all on function public.finish_partner_webhook(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_partner_webhooks(integer) to service_role;
grant execute on function public.finish_partner_webhook(uuid, boolean, text) to service_role;

-- ── Verifications ──────────────────────────────────────────────────────────

create table public.student_verifications (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.pass_partners (client_id) on delete cascade,
  status text not null default 'started' check (status in ('started', 'pending', 'verified', 'rejected')),
  method text check (method in ('pass', 'email', 'document')),
  -- The university email, the document's contact email, or the Pass's.
  email text check (char_length(email) <= 254),
  email_hash text,
  university_id text references public.universities (id),
  valid_until date,
  -- The Pass that shared its badge (one tap).
  user_id uuid references auth.users (id) on delete set null,
  return_url text not null check (char_length(return_url) <= 1000),
  -- The emailed code (15 minutes, 5 tries).
  code_hash text,
  code_expires_at timestamptz,
  attempts smallint not null default 0,
  -- The document waiting for review; deleted once reviewed.
  document_kind text check (document_kind in ('card', 'enrollment')),
  document_path text,
  reject_reason text check (char_length(reject_reason) <= 500),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  -- The "Delete this verification" link in the confirmation email.
  delete_token_hash text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'verified' or (method is not null and university_id is not null and valid_until is not null))
);

comment on table public.student_verifications is
  'Student verifications for one partner app each: the email, university, method, status and expiry. Partners read status, university and expiry only.';

-- One verified record per partner per person.
create unique index student_verifications_email_idx on public.student_verifications (client_id, email_hash)
  where status = 'verified';
create unique index student_verifications_pass_idx on public.student_verifications (client_id, user_id)
  where status = 'verified' and user_id is not null;
create index student_verifications_client_idx on public.student_verifications (client_id, created_at desc);
create index student_verifications_pending_idx on public.student_verifications (created_at) where status = 'pending';
create index student_verifications_university_idx on public.student_verifications (university_id);
create index student_verifications_user_idx on public.student_verifications (user_id);
create index student_verifications_reviewed_by_idx on public.student_verifications (reviewed_by);

create trigger set_updated_at before update on public.student_verifications
  for each row execute function private.set_updated_at();

alter table public.student_verifications enable row level security;

-- Staff review documents in the Inbox; everything else goes through apps/api.
create policy "Support sees verifications" on public.student_verifications
  for select to authenticated using ((select private.has_staff_role('{support}')));

revoke all on public.student_verifications from anon, authenticated;
grant select (id, client_id, status, method, email, university_id, valid_until, document_kind, document_path,
  reject_reason, reviewed_at, created_at)
  on public.student_verifications to authenticated;

-- What the partner is told: the status, the university and the expiry.
create function private.student_verification_event(ver public.student_verifications)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', ver.id,
    'status', ver.status,
    'university', case when ver.status = 'verified' then ver.university_id end,
    'valid_until', case when ver.status = 'verified' then ver.valid_until end
  );
$$;

-- Each change of status (and each deletion) is queued for the partner's
-- webhook, when it has one.
create function private.queue_student_verification_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.pass_partners p
    where p.client_id = coalesce(new.client_id, old.client_id) and p.webhook_url is not null
  ) then
    return null;
  end if;
  if tg_op = 'DELETE' then
    insert into public.partner_webhook_events (client_id, type, payload)
    values (old.client_id, 'student_verification.deleted',
      jsonb_build_object('id', old.id, 'reason',
        case when current_setting('app.replacing_verification', true) = 'on' then 'replaced'
          when old.status = 'verified' and old.valid_until < private.baghdad_today() then 'expired'
          when old.status = 'verified' then 'deleted_by_student' else 'abandoned' end));
  elsif new.status is distinct from old.status then
    insert into public.partner_webhook_events (client_id, type, payload)
    values (new.client_id, 'student_verification.updated', private.student_verification_event(new));
  end if;
  return null;
end;
$$;

create trigger queue_student_verification_event
  after update of status or delete on public.student_verifications
  for each row execute function private.queue_student_verification_event();

-- A random token, its hash kept.
create function private.new_delete_token()
returns text
language sql
volatile
set search_path = ''
as $$ select encode(extensions.gen_random_bytes(24), 'hex') $$;

-- Only one verified record per partner and person: an older one (same
-- email or same Pass) is replaced by the new one.
create function private.replace_student_verification(target uuid, address_hash text, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The partner hears "replaced", not "deleted by the student".
  perform set_config('app.replacing_verification', 'on', true);
  delete from public.student_verifications v
  using public.student_verifications t
  where t.id = target and v.client_id = t.client_id and v.id <> t.id and v.status = 'verified'
    and (v.email_hash = address_hash or (member is not null and v.user_id = member));
  perform set_config('app.replacing_verification', 'off', true);
end;
$$;

-- The partner's backend starts one (apps/api, after checking its app
-- credentials): the return address must be the app's website or one of
-- its return addresses, or on a verified domain of its organization.
create function public.create_student_verification(client text, return_url text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.pass_partners;
  clean text := trim(coalesce(return_url, ''));
  created uuid;
begin
  select * into app from public.pass_partners p where p.client_id = client and p.active;
  if app.client_id is null then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if not (
    clean = any (app.redirect_uris)
    or (clean ~ '^https://[^\s]+$' and app.organization_id is not null
        and private.pass_host_verified(app.organization_id, private.url_host(clean)))
    or (clean ~ '^https://[^\s]+$' and private.url_host(clean) = private.url_host(app.website))
  ) then
    raise exception 'Invalid return address' using errcode = 'check_violation';
  end if;
  insert into public.student_verifications (client_id, return_url) values (app.client_id, clean)
  returning id into created;
  return created;
end;
$$;

-- What theideaiq.com/verify/<id> shows: the partner, where to go back, the
-- status and, when finished, the result. A signed-in Pass holder also sees
-- whether they can share their badge in one tap.
create function private.student_verification_page(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', v.id,
    'partner', p.name,
    'website', p.website,
    'return_url', v.return_url,
    'status', v.status,
    'method', v.method,
    'university', v.university_id,
    'valid_until', v.valid_until,
    'code_sent', v.status = 'started' and v.code_expires_at > now(),
    'reject_reason', case when v.status = 'rejected' then v.reject_reason end,
    'badge', (
      select jsonb_build_object('university', b.university_id, 'valid_until', b.valid_until)
      from public.student_badges b
      where b.user_id = (select auth.uid()) and b.valid_until >= private.baghdad_today()
    )
  )
  from public.student_verifications v
  join public.pass_partners p on p.client_id = v.client_id
  where v.id = target;
$$;

create function public.student_verification_page(target uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.student_verification_page(target) $$;

revoke all on function private.student_verification_page(uuid) from public;
revoke all on function public.student_verification_page(uuid) from public;
grant execute on function private.student_verification_page(uuid) to anon, authenticated;
grant execute on function public.student_verification_page(uuid) to anon, authenticated;

-- The origins that may frame /verify/<id> (its embedded mode): the
-- partner organization's verified domains.
create function private.student_verification_origins(target uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select array(
      select o from public.pass_partner_domains d,
        lateral unnest(array['https://' || d.domain, 'https://*.' || d.domain]) o
      where d.organization_id = p.organization_id and d.verified_at is not null
      order by o
    )
    from public.student_verifications v
    join public.pass_partners p on p.client_id = v.client_id
    where v.id = target and p.active and p.organization_id is not null
  ), '{}');
$$;

create function public.student_verification_origins(target uuid)
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$ select private.student_verification_origins(target) $$;

revoke all on function private.student_verification_origins(uuid) from public;
revoke all on function public.student_verification_origins(uuid) from public;
grant execute on function private.student_verification_origins(uuid) to anon, authenticated;
grant execute on function public.student_verification_origins(uuid) to anon, authenticated;

-- One tap: the signed-in Pass holder's valid badge verifies them for this
-- partner. Returns the email to confirm to and the delete token.
create function public.share_student_verification(target uuid, member uuid)
returns table (email text, delete_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  badge public.student_badges;
  address text;
  token text := private.new_delete_token();
begin
  select * into badge from public.student_badges b
  where b.user_id = member and b.valid_until >= private.baghdad_today();
  if badge.user_id is null then
    raise exception 'Verify you''re a student first' using errcode = 'check_violation';
  end if;
  select coalesce(badge.university_email, lower(u.email)) into address from auth.users u where u.id = member;
  if not exists (select 1 from public.student_verifications v where v.id = target and v.status = 'started') then
    raise exception 'Verification not found' using errcode = 'no_data_found';
  end if;
  perform private.replace_student_verification(target, private.hash_text(coalesce(address, member::text)), member);

  update public.student_verifications v set
    status = 'verified', method = 'pass', user_id = member,
    email = address, email_hash = private.hash_text(coalesce(address, member::text)),
    university_id = badge.university_id, valid_until = badge.valid_until,
    code_hash = null, code_expires_at = null,
    delete_token_hash = private.hash_text(token), verified_at = now()
  where v.id = target and v.status = 'started';
  return query select address, token;
end;
$$;

-- The university email gets a code (apps/api emails it, at most 5 a day
-- per address): the address must be on the university's domains.
create function public.start_student_verification_email(target uuid, university text, address text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  clean text := lower(trim(coalesce(address, '')));
begin
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or not private.email_university(university, clean) then
    raise exception 'Use your university email' using errcode = 'check_violation';
  end if;
  update public.student_verifications v set
    university_id = university, email = clean, email_hash = private.hash_text(clean),
    code_hash = private.hash_text(code), code_expires_at = now() + interval '15 minutes', attempts = 0
  where v.id = target and v.status = 'started';
  if not found then
    raise exception 'Verification not found' using errcode = 'no_data_found';
  end if;
  return code;
end;
$$;

-- The code typed back: verified at once (until 30 June). A wrong code
-- counts a try; after 5 the code stops working.
create function public.confirm_student_verification_email(target uuid, code text)
returns table (verified boolean, email text, delete_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  ver public.student_verifications;
  token text := private.new_delete_token();
begin
  select * into ver from public.student_verifications v
  where v.id = target and v.status = 'started' and v.code_hash is not null
  for update;
  if ver.id is null or ver.code_expires_at < now() or ver.attempts >= 5 then
    raise exception 'Ask for a new code' using errcode = 'check_violation';
  end if;
  if ver.code_hash is distinct from private.hash_text(coalesce(code, '')) then
    update public.student_verifications set attempts = attempts + 1 where id = ver.id;
    return query select false, null::text, null::text;
    return;
  end if;
  perform private.replace_student_verification(ver.id, ver.email_hash, null);
  update public.student_verifications set
    status = 'verified', method = 'email',
    valid_until = private.academic_year_end(private.baghdad_today()),
    code_hash = null, code_expires_at = null,
    delete_token_hash = private.hash_text(token), verified_at = now()
  where id = ver.id
  returning * into ver;
  return query select true, ver.email, token;
end;
$$;

-- A document waits for Staff: a student card or an enrollment proof dated
-- within 3 months, uploaded by apps/api; the email is where the result goes.
create function public.submit_student_verification_document(
  target uuid, university text, address text, kind text, path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := lower(trim(coalesce(address, '')));
begin
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid email' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.universities u where u.id = university and u.active) then
    raise exception 'Unknown university' using errcode = 'check_violation';
  end if;
  update public.student_verifications v set
    status = 'pending', method = 'document', university_id = university,
    email = clean, email_hash = private.hash_text(clean),
    document_kind = kind, document_path = path,
    code_hash = null, code_expires_at = null
  where v.id = target and v.status = 'started';
  if not found then
    raise exception 'Verification not found' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Staff decide a document (apps/api runs this as the staff member, then
-- emails the student and deletes the document). Returns where to email,
-- the document to delete and, when approved, the delete token.
create function private.review_student_verification(target uuid, approve boolean, reason text default null)
returns table (email text, document_path text, delete_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  ver public.student_verifications;
  token text := private.new_delete_token();
  path text;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into ver from public.student_verifications v
  where v.id = target and v.status = 'pending'
  for update;
  if ver.id is null then
    raise exception 'Verification not found' using errcode = 'no_data_found';
  end if;
  path := ver.document_path;
  if approve then
    perform private.replace_student_verification(ver.id, ver.email_hash, null);
  end if;
  update public.student_verifications set
    status = case when approve then 'verified' else 'rejected' end,
    valid_until = case when approve then private.academic_year_end(private.baghdad_today()) end,
    reject_reason = case when approve then null else left(nullif(trim(reason), ''), 500) end,
    document_path = null,
    reviewed_by = (select auth.uid()), reviewed_at = now(),
    delete_token_hash = case when approve then private.hash_text(token) end,
    verified_at = case when approve then now() end
  where id = ver.id
  returning * into ver;
  return query select ver.email, path, case when approve then token end;
end;
$$;

create function public.review_student_verification(target uuid, approve boolean, reason text default null)
returns table (email text, document_path text, delete_token text)
language sql
security invoker
set search_path = ''
as $$ select * from private.review_student_verification(target, approve, reason) $$;

revoke all on function private.review_student_verification(uuid, boolean, text) from public, anon;
revoke all on function public.review_student_verification(uuid, boolean, text) from public, anon;
grant execute on function private.review_student_verification(uuid, boolean, text) to authenticated;
grant execute on function public.review_student_verification(uuid, boolean, text) to authenticated;

-- "Delete this verification", from the confirmation email: gone, and the
-- partner is told.
create function public.delete_student_verification(target uuid, token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.student_verifications v
  where v.id = target and v.delete_token_hash is not null
    and v.delete_token_hash = private.hash_text(coalesce(token, ''));
  return found;
end;
$$;

-- Daily: unfinished verifications go after a day, rejected ones after 30
-- days, and verified ones once their 30 June has passed (the partner is
-- told). Old delivered webhook events go after 30 days. Returns how many
-- verifications went.
create function public.sweep_student_verifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  gone integer;
begin
  delete from public.student_verifications v
  where (v.status = 'started' and v.created_at < now() - interval '1 day')
    or (v.status = 'rejected' and v.reviewed_at < now() - interval '30 days')
    or (v.status = 'verified' and v.valid_until < private.baghdad_today());
  get diagnostics gone = row_count;
  delete from public.partner_webhook_events e
  where e.created_at < now() - interval '30 days';
  return gone;
end;
$$;

revoke all on function public.create_student_verification(text, text) from public, anon, authenticated;
revoke all on function public.share_student_verification(uuid, uuid) from public, anon, authenticated;
revoke all on function public.start_student_verification_email(uuid, text, text) from public, anon, authenticated;
revoke all on function public.confirm_student_verification_email(uuid, text) from public, anon, authenticated;
revoke all on function public.submit_student_verification_document(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.delete_student_verification(uuid, text) from public, anon, authenticated;
revoke all on function public.sweep_student_verifications() from public, anon, authenticated;
revoke all on function private.student_verification_event(public.student_verifications) from public, anon, authenticated;
revoke all on function private.replace_student_verification(uuid, text, uuid) from public, anon, authenticated;
revoke all on function private.new_delete_token() from public, anon, authenticated;
grant execute on function public.create_student_verification(text, text) to service_role;
grant execute on function public.share_student_verification(uuid, uuid) to service_role;
grant execute on function public.start_student_verification_email(uuid, text, text) to service_role;
grant execute on function public.confirm_student_verification_email(uuid, text) to service_role;
grant execute on function public.submit_student_verification_document(uuid, text, text, text, text) to service_role;
grant execute on function public.delete_student_verification(uuid, text) to service_role;
grant execute on function public.sweep_student_verifications() to service_role;

-- ── Documents ──────────────────────────────────────────────────────────────

-- Uploaded by apps/api under <verification id>/; support reads and deletes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-documents', 'student-documents', false, 10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "Support reads student documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'student-documents' and (select private.has_staff_role('{support}')));

create policy "Support deletes student documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'student-documents' and (select private.has_staff_role('{support}')));
