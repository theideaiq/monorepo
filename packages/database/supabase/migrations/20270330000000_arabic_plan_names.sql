-- Arabic copy has no Latin letters (owner decision, 2026-11-04): every
-- Plus plan gets its Arabic name in Arabic letters. Before this, six plans
-- had none (Arabic pages showed "Plus Glow") and the rest kept the tier in
-- Latin ("ايديا پلص Glow").
--
-- Tiers: Glow گلو, Shine شاين, Blaze بليز; Duo ديو; students للطلاب.

update public.plans p
set name_ar = 'ايديا پلص '
  || case
    when p.id like 'plus-glow%' then 'گلو'
    when p.id like 'plus-shine%' then 'شاين'
    when p.id like 'plus-blaze%' then 'بليز'
  end
  || case when p.id like '%-duo%' then ' ديو' else '' end
  || case when p.id like '%-student' then ' (للطلاب)' else '' end
where p.id ~ '^plus-(glow|shine|blaze)(-duo)?(-year|-student)?$';
