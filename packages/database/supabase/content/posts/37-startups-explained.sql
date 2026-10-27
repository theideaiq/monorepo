-- The IDEA Post: Startups explained (Learn)
do $do$
declare
  post_id uuid;
begin
  insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
  values (
    'startups-explained',
    'learn',
    $ar$ما هي الشركة الناشئة (Startup)؟ التمويل والشراكات وأسباب الفشل$ar$,
    $en$What is a startup? Funding, partnerships and why most fail$en$,
    $ar$الشركة الناشئة فكرة طموحة تحتاج من يرعاها: تمويلاً وشراكات وتسويقاً. دليل مبسّط، مع تحديات بيئة الأعمال في العراق.$ar$,
    $en$A startup is an ambitious idea that needs care: funding, partners and marketing. A simple guide, including the challenges in Iraq.$en$,
    $ar$سواء كنت قديماً في عالم الأعمال أو بدأت للتو، لا بد أنك سمعت بكلمة **Startup**. فما معناها؟

## ما هي الشركة الناشئة؟

الشركة الناشئة شركة حديثة تقوم على فكرة جديدة أو مميّزة في السوق، وتعتمد على نموذج عمل يمكن أن **ينمو بسرعة كبيرة**. في بدايتها لا تكفي إيراداتها عادة لتغطية احتياجاتها، فتبحث دائماً عن مكان لها في السوق وعن من يموّل نموّها وتوسّعها.

تخيّلها **طفلاً صغيراً بدأ يمشي للتو**: طموح ومبدع وقد يحقّق الكثير، لكنه يحتاج إلى من يطعمه (التمويل)، ومن يربّيه ويرشده (الشراكات والإرشاد)، وأن يخرج إلى العالم ويعرفه الناس (التسويق).

## 1. التمويل: غذاء الشركة

أغلب مشاكل الشركات الناشئة تبدأ من ميزانية ضعيفة. توظيف المزيد من الأشخاص، أو توسيع مساحة العمل، أو إضافة خدمة جديدة، كلها قرارات تحتاج مالاً. أشهر مصادر التمويل:

- **التمويل الذاتي (Bootstrapping):** تبدأ بمالك الخاص أو بإيرادات أول عملائك. أبطأ، لكنه يبقي الشركة ملكك.
- **حاضنات ومسرّعات الأعمال (Incubators & Accelerators):** برامج تقيمها منظمات أو شركات كبيرة، تقدّم التدريب والإرشاد ومساحة العمل، وأحياناً تمويلاً مقابل حصة صغيرة.
- **المستثمرون الملائكيون (Angel Investors):** أفراد يستثمرون أموالهم في المراحل المبكرة مقابل حصة في الشركة.
- **رأس المال الجريء (Venture Capital):** صناديق تستثمر مبالغ أكبر في شركات أثبتت إمكانية نموّها.
- **المنح والمسابقات:** تقدّمها منظمات وجهات داعمة لريادة الأعمال، ولا تتطلب غالباً التنازل عن حصة.

## 2. الشراكات والإرشاد: تربية الشركة

عالم الأعمال قاسٍ، والشركات تنجح أكثر حين تتعاون. **الشراكة** اتفاق رسمي بين طرفين قائم على التفاهم وتبادل المنفعة، ومن فوائدها:

- حملات تسويقية مشتركة تصل إلى جمهور أوسع.
- تبادل الخبرة والاستشارات.
- العمل على مشروع أو هدف مشترك.

ولا تقلّ أهمية المرشد: شخص سبقك في الطريق ويختصر عليك أخطاء كثيرة.

## 3. التسويق: أن يعرفك الناس

مع التنافس الشديد في السوق، صار التسويق ضرورة لإطلاق أي مشروع. اعرف جمهورك جيداً، وابنِ حضوراً واضحاً على وسائل التواصل، واعتمد على [المحتوى](/club/content-writing) و[كتابة الإعلانات](/club/copywriting) لتحكي قصة منتجك. وإن كنت تبيع لشركات أخرى، فاقرأ [دليل تسويق B2B](/club/b2b-marketing).

## لماذا تفشل أغلب الشركات الناشئة؟

يُقال كثيراً إن نحو **90%** من الشركات الناشئة تفشل في النهاية، ويحدث جزء كبير من ذلك في سنواتها الأولى. الأرقام تختلف حسب الدراسة والبلد، لكن الأسباب متشابهة:

- منتج لا يحتاجه السوق فعلاً.
- نفاد المال قبل الوصول إلى إيرادات كافية.
- فريق غير متكامل أو خلافات بين المؤسسين.
- غياب خطة عمل واضحة وخطط لمواجهة المشاكل.

## التحديات في العراق

رغم دعم المنظمات غير الحكومية وحاضنات الأعمال، وكون السوق العراقي أرضاً خصبة لأفكار كثيرة، تبقى مشاريع كثيرة صامدة لفترة قصيرة بعد انتهاء الدعم المالي. من أكثر الأسباب شيوعاً:

- ضعف الخبرة في إدارة الأموال واستثمار التمويل الذي حصل عليه المشروع.
- نقص في خطة العمل وفي خطط مواجهة التحديات.
- مؤسس يرى نفسه "صاحب المشروع" فقط ويترك العمل الفعلي للآخرين، بينما تحتاج الشركة الناشئة في سنتها الأولى قائداً يعمل بيده ويتّخذ قرارات سريعة وحاسمة.

## نصائح قبل أن تبدأ

- تحقّق من الفكرة: تحدّث مع عملاء محتملين قبل أن تبني أي شيء.
- ابدأ بنسخة بسيطة من المنتج (MVP) وطوّرها بناءً على آراء المستخدمين.
- راقب مصاريفك شهرياً، واعرف كم شهراً يكفيك مالك الحالي.
- أحِط نفسك بفريق يكمّل مهاراتك، وبمرشدين صادقين.
- تعلّم من الفشل بسرعة، وعدّل اتجاهك عند الحاجة.

## مصادر مفيدة

- [Y Combinator Startup School](https://www.startupschool.org) (مجاني)
- [تسويق B2B](/club/b2b-marketing)
- [المهارات الشخصية في العمل](/club/soft-skills)
- [الحسابات المصرفية في العراق](/club/bank-accounts-in-iraq)
- ولتلتقي بروّاد أعمال آخرين: [The IDEA Club](https://t.me/theideaiq_club)$ar$,
    $en$Whether you're a business veteran or just starting out, you've almost certainly heard the word **startup**. So what does it mean?

## What is a startup?

A startup is a young company built on a new or distinctive idea, with a business model that can **grow very fast**. Early on, its revenue usually can't cover its needs, so it's always looking for its place in the market and for someone to fund its growth.

Picture it as **a toddler taking first steps**: ambitious, creative and full of potential, but it needs someone to feed it (funding), someone to raise and guide it (partnerships and mentoring), and a chance to go out and be known (marketing).

## 1. Funding: what keeps it alive

Most startup problems begin with a thin budget. Hiring, more space, a new service: every decision needs money. The most common sources:

- **Bootstrapping:** you start with your own money or your first customers' revenue. Slower, but the company stays yours.
- **Incubators and accelerators:** programs run by organizations or large companies that offer training, mentoring and workspace, sometimes with funding in exchange for a small stake.
- **Angel investors:** individuals who invest their own money early in exchange for equity.
- **Venture capital:** funds that invest larger amounts in companies that have shown they can grow.
- **Grants and competitions:** offered by organizations that support entrepreneurship, usually without taking equity.

## 2. Partnerships and mentoring: how it grows up

Business is tough, and companies succeed more when they cooperate. A **partnership** is a formal agreement between two parties based on mutual understanding and benefit. Partnerships can bring:

- Joint marketing campaigns that reach a wider audience.
- Shared expertise and advice.
- Work toward a common project or goal.

A mentor matters just as much: someone who's walked the road before and can save you from many mistakes.

## 3. Marketing: getting known

With fierce competition, marketing is essential to launching anything. Know your audience well, build a clear presence on social media, and use [content](/club/content-writing) and [copywriting](/club/copywriting) to tell your product's story. If you sell to other businesses, read [our B2B marketing guide](/club/b2b-marketing).

## Why do most startups fail?

It's often said that around **90%** of startups eventually fail, many of them in their first few years. The numbers vary by study and country, but the reasons are similar:

- A product the market doesn't really need.
- Running out of money before revenue is enough.
- An incomplete team or conflict between founders.
- No clear business plan, and no plan for problems.

## The challenges in Iraq

Despite support from NGOs and business incubators, and a market with room for many ideas, many projects in Iraq don't last long after their initial funding ends. Common reasons:

- Little experience managing money and putting funding to work.
- Gaps in the business plan and in plans for handling challenges.
- A founder who sees themselves only as "the owner" and leaves the real work to others, when a startup's first year needs a hands-on leader who makes fast, firm decisions.

## Tips before you start

- Validate the idea: talk to potential customers before you build anything.
- Start with a minimum viable product (MVP) and improve it based on user feedback.
- Track your spending monthly and know how many months your current money will last.
- Surround yourself with a team that complements your skills, and with honest mentors.
- Learn from failure quickly and change course when you need to.

## Useful resources

- [Y Combinator Startup School](https://www.startupschool.org) (free)
- [B2B marketing](/club/b2b-marketing)
- [Soft skills at work](/club/soft-skills)
- [Bank accounts in Iraq](/club/bank-accounts-in-iraq)
- To meet other founders: [The IDEA Club](https://t.me/theideaiq_club)$en$,
    now() - interval '37 minutes'
  )
  on conflict (slug) do update set
    section = excluded.section,
    title_ar = excluded.title_ar,
    title_en = excluded.title_en,
    excerpt_ar = excluded.excerpt_ar,
    excerpt_en = excluded.excerpt_en,
    body_ar = excluded.body_ar,
    body_en = excluded.body_en,
    updated_at = now()
  returning id into post_id;

  -- Imported, not breaking news: don't post it to The IDEA Club.
  update public.telegram_posts
  set sent_at = coalesce(sent_at, now())
  where kind = 'news' and ref_id = post_id;
end;
$do$;
