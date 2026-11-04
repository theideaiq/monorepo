-- Versions' Arabic labels in Arabic letters (owner decision, 2026-11-04:
-- no Latin letters in Arabic copy; titles of works stay as published, but
-- formats and platforms are our own words). Only the labels change; the
-- attributes the filters use stay as they are.

update public.product_variants
set label_ar = case label_ar
  when 'قرص CD' then 'قرص سي دي'
  when 'PS5' then 'پلايستيشن 5'
  when 'Blu-ray' then 'بلو راي'
  when 'Nintendo Switch' then 'نينتندو سويتش'
end
where label_ar in ('قرص CD', 'PS5', 'Blu-ray', 'Nintendo Switch');
