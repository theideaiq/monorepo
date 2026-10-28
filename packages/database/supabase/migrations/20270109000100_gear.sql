-- Audio and Tech become one category, Gear (owner decisions of
-- 2026-10-28, section 9). Tech's row becomes Gear (slug `gear`, fifth
-- after Films); Audio's products and rental rate move to it and Audio
-- goes. The store filters and search read the categories table, so links
-- and search follow; old `?category=audio` and `?category=tech` links
-- show the whole store, with no redirects.

update public.product_categories
set slug = 'gear', name_en = 'Gear', name_ar = 'الأجهزة', position = 5
where slug = 'tech';

update public.products
set category_id = (select id from public.product_categories where slug = 'gear')
where category_id = (select id from public.product_categories where slug = 'audio');

-- Gear keeps its own rental rate, else takes Audio's.
insert into public.rental_rates (category_id, price, days, late_fee)
select g.id, r.price, r.days, r.late_fee
from public.rental_rates r
join public.product_categories a on a.id = r.category_id and a.slug = 'audio'
cross join public.product_categories g
where g.slug = 'gear'
on conflict (category_id) do nothing;

delete from public.product_categories where slug = 'audio';
