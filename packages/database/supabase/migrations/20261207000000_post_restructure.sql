-- The IDEA Post: members' work becomes part of Stories, and events become a
-- section of The Post at /post/events.
--
-- The `members` enum value stays (Postgres can't drop it in place) but no
-- post may use it any more; accepted submissions are published as Stories.
-- `/post/events` is a page, so no post may take the slug `events`.

update public.posts set section = 'stories' where section = 'members';

alter table public.posts
  add constraint posts_section_not_members check (section <> 'members'),
  drop constraint posts_slug_not_section,
  add constraint posts_slug_not_section
    check (slug not in ('news', 'stories', 'members', 'learn', 'events'));

comment on column public.posts.section is
  'The Post section: news, stories (features, interviews and members'' work) or learn.';
