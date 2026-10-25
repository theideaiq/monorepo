-- The Post: News, Journal and Academy become one publication at /post,
-- online only, with four sections:
--   news     announcements;
--   stories  features and interviews;
--   members  members' work (accepted submissions: essays, poetry, fiction,
--            theatre, art), still reviewed blind;
--   learn    guides and courses (what was the Academy page).
--
-- Posts gain a section, an optional byline (the member's name on members'
-- work; "The IDEA" when empty) and a link to the submission they came from.
-- The PDF journal issues are retired: nothing was published in them.

create type public.post_section as enum ('news', 'stories', 'members', 'learn');

alter table public.posts
  add column section public.post_section not null default 'news',
  add column byline text check (char_length(byline) between 1 and 120),
  add column submission_id uuid unique references public.submissions (id) on delete set null,
  -- /post/news … are the section pages, so no post may take those slugs.
  add constraint posts_slug_not_section
    check (slug not in ('news', 'stories', 'members', 'learn'));

comment on column public.posts.section is
  'The Post section: news, stories, members (members'' work) or learn.';
comment on column public.posts.byline is
  'Who wrote it, as shown on the post (the member on members'' work); empty means The IDEA.';
comment on column public.posts.submission_id is
  'The accepted submission this post publishes (members'' work).';

create index posts_section_published_idx
  on public.posts (section, published_at desc);

-- Only accepted submissions can become posts.
create function private.check_post_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.submission_id is not null
    and new.submission_id is distinct from (case when tg_op = 'UPDATE' then old.submission_id end)
    and not exists (
      select 1 from public.submissions s
      where s.id = new.submission_id and s.status = 'accepted'
    )
  then
    raise exception 'Only an accepted submission can be published'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_post_submission before insert or update of submission_id on public.posts
  for each row execute function private.check_post_submission();

-- ── Journal issues (retired) ───────────────────────────────────────────────

drop table public.journal_issues;
