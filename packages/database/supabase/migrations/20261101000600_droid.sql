-- Droid, the Telegram bot (apps/api /telegram/webhook, @repo/droid).
--
-- The bot runs with the secret key, so these tables have no customer
-- policies; staff read and manage them in the back office.
--
-- telegram_chats      groups the bot moderates (bans apply across all of them)
-- telegram_members    people who talked to the bot or in a moderated group
-- telegram_requests   unban requests and other messages for staff
-- telegram_faq        questions and answers the bot offers in private chats

create type public.telegram_request_type as enum ('unban', 'support');
create type public.telegram_request_status as enum ('open', 'resolved', 'rejected');

create table public.telegram_chats (
  id bigint primary key,
  title text not null,
  username text,
  moderated boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.telegram_members (
  id bigint primary key,
  username text,
  first_name text,
  last_name text,
  language_code text,
  -- Latest status in any moderated group (member, administrator, kicked…).
  chat_status text,
  banned_at timestamptz,
  newsletter_opt_in boolean not null default false,
  -- Set when the member links their Telegram account to an IDEA account.
  user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index telegram_members_username_idx on public.telegram_members (lower(username));

create table public.telegram_requests (
  id uuid primary key default gen_random_uuid(),
  member_id bigint not null references public.telegram_members (id) on delete cascade,
  type public.telegram_request_type not null,
  message text not null check (char_length(message) between 1 and 2000),
  status public.telegram_request_status not null default 'open',
  resolved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index telegram_requests_open_idx on public.telegram_requests (created_at) where status = 'open';

create table public.telegram_faq (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (topic in ('general', 'store', 'plus', 'academy', 'suite')),
  question_ar text not null check (char_length(question_ar) between 1 and 200),
  question_en text not null check (char_length(question_en) between 1 and 200),
  answer_ar text not null check (char_length(answer_ar) between 1 and 4000),
  answer_en text not null check (char_length(answer_en) between 1 and 4000),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.telegram_members
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.telegram_requests
  for each row execute function private.set_updated_at();

alter table public.telegram_chats enable row level security;
alter table public.telegram_members enable row level security;
alter table public.telegram_requests enable row level security;
alter table public.telegram_faq enable row level security;

create policy "Support manages moderated chats"
  on public.telegram_chats for all to authenticated
  using (private.has_staff_role('{support}'))
  with check (private.has_staff_role('{support}'));

create policy "Support sees Telegram members"
  on public.telegram_members for select to authenticated
  using (private.has_staff_role('{support}'));

create policy "Support handles Telegram requests"
  on public.telegram_requests for all to authenticated
  using (private.has_staff_role('{support}'))
  with check (private.has_staff_role('{support}'));

create policy "Support and marketing manage the FAQ"
  on public.telegram_faq for all to authenticated
  using (private.has_staff_role('{support,marketing}'))
  with check (private.has_staff_role('{support,marketing}'));

create trigger audit_telegram_chats after insert or update or delete on public.telegram_chats
  for each row execute function private.audit_change();
create trigger audit_telegram_requests after update on public.telegram_requests
  for each row execute function private.audit_change();

revoke all on public.telegram_chats, public.telegram_members, public.telegram_requests,
  public.telegram_faq from anon, authenticated;

grant select, insert, update, delete on public.telegram_chats, public.telegram_faq to authenticated;
grant select on public.telegram_members to authenticated;
grant select on public.telegram_requests to authenticated;
grant update (status, resolved_by) on public.telegram_requests to authenticated;

grant all on public.telegram_chats, public.telegram_members, public.telegram_requests,
  public.telegram_faq to service_role;
