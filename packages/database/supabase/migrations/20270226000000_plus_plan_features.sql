-- Plus features, part 5 (owner's master brief, step 12, section 17): plan
-- cards list what each tier gets. Data only: the features shown on the
-- plan cards, with the 3% / 4% / 5% Bulbs rates and without the counter's
-- pickup swaps.

update public.plans set
  features_en = array[
    '1 item at a time', '1 home swap a month', '3% Bulbs back',
    '10 survey credits a month', 'Campaigns 24 hours early',
    'Club RSVPs 48 hours early', 'Plus prices and partner perks'
  ],
  features_ar = array[
    'غرض واحد في كل مرة', 'تبديل منزلي واحد شهريًا', '3% Bulbs',
    '10 أرصدة استبيانات شهريًا', 'العروض الموسمية قبل 24 ساعة',
    'حجز فعاليات النادي قبل 48 ساعة', 'أسعار Plus وعروض الشركاء'
  ]
where id in ('plus-glow', 'plus-glow-student');

update public.plans set
  features_en = array[
    '2 items at a time', '2 home swaps a month', 'Free Store delivery in Baghdad',
    'New releases in their first 30 days', '4% Bulbs back', '25 survey credits a month',
    'Campaigns 24 hours early', '10% off game night kits',
    'Club RSVPs 48 hours early', 'Plus prices and partner perks'
  ],
  features_ar = array[
    'غرضان في كل مرة', 'تبديلان منزليان شهريًا', 'توصيل مجاني لطلبات المتجر في بغداد',
    'الإصدارات الجديدة في أول 30 يومًا', '4% Bulbs', '25 رصيد استبيانات شهريًا',
    'العروض الموسمية قبل 24 ساعة', 'خصم 10% على عُدَد ليلة الألعاب',
    'حجز فعاليات النادي قبل 48 ساعة', 'أسعار Plus وعروض الشركاء'
  ]
where id in ('plus-shine', 'plus-shine-student');

update public.plans set
  features_en = array[
    '4 items at a time', '4 home swaps a month', 'Everything in Shine', '5% Bulbs back',
    '50 survey credits a month', 'Campaigns 48 hours early', '25% off game night kits',
    'Seats held for Blaze at Club events'
  ],
  features_ar = array[
    'أربعة أغراض في كل مرة', '4 تبديلات منزلية شهريًا', 'كل ما في Shine', '5% Bulbs',
    '50 رصيد استبيانات شهريًا', 'العروض الموسمية قبل 48 ساعة', 'خصم 25% على عُدَد ليلة الألعاب',
    'مقاعد محجوزة لـ Blaze في فعاليات النادي'
  ]
where id in ('plus-blaze', 'plus-blaze-student');

-- Yearly plans: the same, paying 10 months for 12.
update public.plans y set
  features_en = m.features_en || 'Pay 10 months, get 12'::text,
  features_ar = m.features_ar || 'ادفع 10 أشهر واحصل على 12'::text
from public.plans m
where (y.id, m.id) in (
  ('plus-glow-year', 'plus-glow'), ('plus-shine-year', 'plus-shine'), ('plus-blaze-year', 'plus-blaze')
);
