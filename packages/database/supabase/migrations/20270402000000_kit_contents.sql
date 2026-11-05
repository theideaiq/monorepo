-- PR 7, C11: what's inside a game night kit.
--
-- Each kit type lists what's in the box, item by item, in both languages
-- (a console, two controllers, an HDMI cable…), entered by staff in Staff →
-- Plus → Kits and shown on the kit's page. Nothing is filled in here: an
-- empty list shows nothing, so the website never claims what staff haven't
-- written. The two lists are kept item for item (same length).

alter table public.kit_types
  add column contents_ar text[] not null default '{}',
  add column contents_en text[] not null default '{}',
  add constraint kit_types_contents_paired
    check (cardinality(contents_ar) = cardinality(contents_en)),
  add constraint kit_types_contents_size
    check (
      cardinality(contents_en) <= 20
      and char_length(array_to_string(contents_ar, '')) <= 2000
      and char_length(array_to_string(contents_en, '')) <= 2000
      and array_position(contents_ar, '') is null
      and array_position(contents_en, '') is null
    );

comment on column public.kit_types.contents_en is
  'What''s in the box, item by item (English); paired with contents_ar.';
