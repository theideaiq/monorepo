-- Local development seed (runs after migrations on `supabase db reset`).
-- Prices are in IQD (whole dinars). Production plans and the catalog are
-- managed in the back office (/staff on The IDEA Business).

insert into public.plans
  (id, name, description, amount, currency, billing_interval, audience, rental_slots, tier, features_ar, features_en, position)
values
  ('business-monthly', 'The IDEA Business', 'Procurement and recruitment for companies', 150000, 'IQD', 'month', 'business', null, null,
    '{"طلبات شراء للشركات","فواتير شهرية","مدير حساب"}', '{"Company purchase orders","Monthly invoicing","Account manager"}', 10)
on conflict (id) do nothing;

-- The Plus plans come from the migrations, switched off until Plus
-- launches; locally they're on.
update public.plans set active = true where audience = 'plus';

insert into public.product_categories (id, slug, name_ar, name_en, position) values
  ('50000000-0000-0000-0000-000000000001', 'gaming', 'الألعاب', 'Gaming', 1),
  ('50000000-0000-0000-0000-000000000002', 'laptops', 'الحواسيب', 'Laptops', 2),
  ('50000000-0000-0000-0000-000000000003', 'phones', 'الهواتف', 'Phones', 3),
  ('50000000-0000-0000-0000-000000000004', 'books', 'الكتب', 'Books', 4),
  ('50000000-0000-0000-0000-000000000005', 'music', 'الموسيقى', 'Music', 5),
  ('50000000-0000-0000-0000-000000000006', 'films', 'الأفلام', 'Films', 6)
on conflict (id) do nothing;

insert into public.products
  (slug, kind, status, category_id, name_ar, name_en, description_ar, description_en, price, compare_at_price, stock_count, featured, details)
values
  ('playstation-5-slim', 'sale', 'active', '50000000-0000-0000-0000-000000000001',
    'بلايستيشن ٥ سليم', 'PlayStation 5 Slim',
    'جهاز بلايستيشن ٥ بإصدار سليم مع يد تحكم DualSense.', 'PlayStation 5 Slim console with a DualSense controller.',
    720000, 780000, 8, true, '{"Storage": "1 TB", "Warranty": "1 year"}'),
  ('logitech-g502', 'sale', 'active', '50000000-0000-0000-0000-000000000001',
    'فأرة لوجيتك G502', 'Logitech G502 Mouse',
    'فأرة ألعاب سلكية بمستشعر HERO.', 'Wired gaming mouse with the HERO sensor.',
    120000, 180000, 25, true, '{"DPI": "25,600"}'),
  ('macbook-air-m3', 'sale', 'active', '50000000-0000-0000-0000-000000000002',
    'ماك بوك إير M3', 'MacBook Air M3',
    'حاسوب محمول خفيف بشريحة M3.', 'Lightweight laptop with the M3 chip.',
    1650000, null, 4, false, '{"Memory": "16 GB", "Storage": "512 GB"}'),
  ('the-alchemist', 'sale', 'active', '50000000-0000-0000-0000-000000000004',
    'الخيميائي', 'The Alchemist',
    'رواية باولو كويلو.', 'The novel by Paulo Coelho.',
    15000, null, 40, false, '{"Language": "Arabic"}'),
  ('elden-ring-ps5', 'rental', 'active', '50000000-0000-0000-0000-000000000001',
    'إلدن رينغ (PS5)', 'Elden Ring (PS5)',
    'لعبة إلدن رينغ لجهاز بلايستيشن ٥.', 'Elden Ring for PlayStation 5.',
    60000, null, 3, true, '{"Platform": "PS5"}'),
  ('ea-fc-26-ps5', 'rental', 'active', '50000000-0000-0000-0000-000000000001',
    'EA FC 26 (PS5)', 'EA FC 26 (PS5)',
    'أحدث إصدار من سلسلة كرة القدم.', 'The latest edition of the football series.',
    70000, null, 5, false, '{"Platform": "PS5"}'),
  ('one-hundred-years-of-solitude', 'rental', 'active', '50000000-0000-0000-0000-000000000004',
    'مئة عام من العزلة', 'One Hundred Years of Solitude',
    'رواية غابرييل غارسيا ماركيز.', 'The novel by Gabriel García Márquez.',
    20000, null, 2, false, '{"Language": "Arabic"}')
on conflict (slug) do nothing;

-- The product's default variant becomes the disc edition; the digital one
-- is a second variant.
update public.product_variants v set
  sku = 'PS5-SLIM-DISC',
  label_en = 'Disc',
  label_ar = 'بقرص',
  attributes = '{"Edition": "Disc"}'::jsonb,
  stock_count = 5,
  position = 1
from public.products p
where p.id = v.product_id and p.slug = 'playstation-5-slim' and v.sku is null;

insert into public.product_variants (product_id, sku, label_en, label_ar, attributes, price, stock_count, position)
select id, 'PS5-SLIM-DIGITAL', 'Digital', 'رقمي', '{"Edition": "Digital"}'::jsonb, 650000, 3, 2
from public.products where slug = 'playstation-5-slim'
on conflict (sku) do nothing;

insert into public.posts (slug, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at) values
  ('welcome-to-the-idea', 'مرحباً بكم في The IDEA', 'Welcome to The IDEA',
    'متجر وتأجير ونادٍ وحلول للشركات ببطاقة واحدة.', 'A store, rentals, a club and business solutions with one Pass.',
    'نطلق اليوم منصة The IDEA الجديدة.', 'Today we are launching the new The IDEA platform.', now())
on conflict (slug) do nothing;

insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at) values
  ('how-plus-rentals-work', 'learn', 'كيف يعمل الإيجار في The IDEA Plus', 'How The IDEA Plus rentals work',
    'اختر، استلم، أعد: دليل قصير.', 'Pick, receive, return: a short guide.',
    'اختر ما تريد من المتجر، ونوصله إليك، وتعيده متى انتهيت.', 'Pick what you want in the store, we deliver it, and you return it when you are done.', now()),
  ('behind-the-counter', 'stories', 'خلف الكاونتر', 'Behind the counter',
    'لقاء مع فريق المتجر.', 'Meet the store team.',
    'تعرّف على الفريق الذي يختار كل قطعة في المتجر.', 'Meet the team who pick every item in the store.', now())
on conflict (slug) do nothing;

insert into public.events (slug, title_ar, title_en, description_ar, description_en, location, starts_at, ends_at, capacity, published) values
  ('launch-night', 'ليلة الإطلاق', 'Launch night',
    'أمسية للاحتفال بإطلاق المنصة.', 'An evening to celebrate the launch.',
    'Baghdad', now() + interval '14 days', now() + interval '14 days 3 hours', 80, true)
on conflict (slug) do nothing;

insert into public.chart_of_accounts (code, name, type, category) values
  ('1000', 'Cash', 'asset', null),
  ('1100', 'Wayl balance', 'asset', null),
  ('1200', 'Inventory', 'asset', null),
  ('2000', 'Accounts payable', 'liability', null),
  ('3000', 'Owner''s equity', 'equity', null),
  ('4000', 'Store sales', 'revenue', null),
  ('4100', 'Plus memberships', 'revenue', null),
  ('4200', 'Business services', 'revenue', null),
  ('5000', 'Cost of goods sold', 'expense', 'cogs'),
  ('6000', 'Salaries', 'expense', null),
  ('6100', 'Rent', 'expense', null),
  ('6200', 'Marketing', 'expense', null)
on conflict (code) do nothing;

insert into public.telegram_faq (topic, question_ar, question_en, answer_ar, answer_en, position) values
  ('store', 'كم تستغرق عملية التوصيل؟', 'How long does delivery take?',
    'نوصل داخل بغداد في نفس اليوم أو اليوم التالي، وإلى المحافظات خلال ٢–٤ أيام.',
    'Same or next day in Baghdad, and 2–4 days to other governorates.', 1),
  ('plus', 'كيف يعمل اشتراك Plus؟', 'How does Plus work?',
    'اختر خطة، ثم اطلب الألعاب أو الكتب من التطبيق وسنوصلها إليك. أعدها متى شئت واطلب غيرها.',
    'Pick a plan, then request games or books in the app and we deliver them. Return them whenever you like and request more.', 1)
on conflict do nothing;

-- Newest releases need The IDEA Plus Extra or higher.
update public.products set rental_tier = 2 where slug = 'ea-fc-26-ps5';

-- Local store pickup (production sets the real address in the back office).
update public.store_settings set
  pickup_enabled = true,
  pickup_address_ar = 'بغداد، الكرادة، شارع ٦٢ — متجر The IDEA',
  pickup_address_en = 'The IDEA store, Street 62, Karrada, Baghdad',
  pickup_hours_ar = 'السبت إلى الخميس، ١٠ صباحاً – ٩ مساءً',
  pickup_hours_en = 'Saturday to Thursday, 10 am – 9 pm';

-- Affiliate commission on media (see the affiliates migration).
update public.product_categories set affiliate_rate = 8 where slug in ('books', 'music');
