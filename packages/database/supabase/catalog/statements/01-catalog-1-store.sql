insert into public.product_categories (slug, name_ar, name_en, kind, position) values
  ('gaming', 'الألعاب', 'Gaming', 'sale'::public.product_kind, 1),
  ('laptops', 'الحواسيب', 'Laptops', 'sale'::public.product_kind, 2),
  ('phones', 'الهواتف', 'Phones', 'sale'::public.product_kind, 3),
  ('books', 'الكتب', 'Books', 'sale'::public.product_kind, 4),
  ('rent-games', 'ألعاب للإيجار', 'Games to rent', 'rental'::public.product_kind, 5),
  ('rent-books', 'كتب للإيجار', 'Books to rent', 'rental'::public.product_kind, 6),
  ('vinyl', 'أسطوانات الفينيل', 'Vinyl records', 'sale'::public.product_kind, 7),
  ('cds-and-cassettes', 'الأقراص المدمجة والكاسيت', 'CDs and cassettes', 'sale'::public.product_kind, 8),
  ('audio', 'الصوتيات', 'Audio', 'sale'::public.product_kind, 9),
  ('cameras', 'الكاميرات', 'Cameras', 'sale'::public.product_kind, 10),
  ('gadgets', 'أجهزة ذكية', 'Gadgets', 'sale'::public.product_kind, 11),
  ('rent-films', 'أفلام للإيجار', 'Films to rent', 'rental'::public.product_kind, 12)
on conflict (slug) do update set name_ar = excluded.name_ar, name_en = excluded.name_en;
