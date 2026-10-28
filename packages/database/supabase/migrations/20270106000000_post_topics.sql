-- The IDEA Club's Read feed (Program Revision v2, item 8): posts carry
-- topic tags (`/club?topic=guides`) instead of sections. News, Stories and
-- Guides become the first topics: news → news, stories and members' work →
-- stories, learn → guides. A post has one to five topics.
--
-- `section` stays until the apps stop reading it (a later migration drops
-- it); meanwhile a post saved without topics takes them from its section.

create type public.post_topic as enum ('news', 'stories', 'guides');

alter table public.posts
  add column topics public.post_topic[] not null default '{}'
    check (cardinality(topics) <= 5);

comment on column public.posts.topics is
  'Topic tags shown in the Read feed (/club?topic=…): news, stories, guides.';

create function private.post_topics_from_section(section public.post_section)
returns public.post_topic[]
language sql
immutable
set search_path = ''
as $$
  select array[case section
    when 'news' then 'news'
    when 'learn' then 'guides'
    else 'stories'
  end]::public.post_topic[]
$$;

update public.posts set topics = private.post_topics_from_section(section);

-- Unique, in a stable order, and never empty (until `section` goes).
create function private.normalize_post_topics()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.topics := coalesce((
    select array_agg(distinct t order by t) from unnest(new.topics) t
  ), '{}');
  if cardinality(new.topics) = 0 then
    new.topics := private.post_topics_from_section(new.section);
  end if;
  return new;
end;
$$;

create trigger normalize_post_topics before insert or update of topics, section on public.posts
  for each row execute function private.normalize_post_topics();

create index posts_topics_idx on public.posts using gin (topics);
