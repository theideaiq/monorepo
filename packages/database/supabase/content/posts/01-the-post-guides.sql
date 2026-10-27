-- The IDEA Post: The IDEA Post's guides are now on the website (News)
do $do$
declare
  post_id uuid;
begin
  insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
  values (
    'the-post-guides',
    'news',
    $ar$أدلّة The IDEA Post صارت على الموقع$ar$,
    $en$The IDEA Post's guides are now on the website$en$,
    $ar$كل ما نشرناه على تيليجرام عن المنح والدراسة في الخارج والمهارات، مُحدّثاً ومرتّباً في مكان واحد.$ar$,
    $en$Everything we published on Telegram about scholarships, studying abroad and skills, updated and organized in one place.$en$,
    $ar$بدأت The IDEA Post قناةً على تيليجرام تجمع الفرص والنصائح لطلبة العراق: كيف تكتب مقالة القبول، ومتى تقدّم على برامج التبادل، وأيّ اختبار لغة تختار، وكيف تبدأ مسيرتك في التقنية أو التصميم أو الكتابة.

اليوم نقلنا هذه الأدلّة إلى قسم **تعلّم** في The IDEA Post على موقعنا. لم ننسخها كما هي؛ راجعنا كل دليل، وحدّثنا ما تغيّر (مثل اختبار SAT الرقمي وصيغة البيان الشخصي الجديدة في UCAS)، وحذفنا الفرص التي انتهت، وجمعنا المواضيع المتشابهة في دليل واحد.

## من أين تبدأ

- **الدراسة في الخارج:** [خطة التقديم خطوة بخطوة](/club/study-abroad-roadmap)، [مقالة Common App](/club/common-app-essay)، [البيان الشخصي لبريطانيا](/club/uk-personal-statement)، [المعدل التراكمي GPA](/club/gpa-for-us-applications) و[دليل SAT](/club/sat-guide).
- **اختبارات اللغة:** [IELTS](/club/ielts-guide) و[Duolingo English Test](/club/duolingo-english-test)، و[كيف تطوّر إنجليزيتك](/club/improve-your-english).
- **الوجهات:** [ألمانيا](/club/study-in-germany)، [تركيا](/club/study-in-turkey)، [روسيا](/club/study-in-russia)، [الجامعات الأمريكية في المنطقة](/club/american-universities-in-the-region) و[الكليات المجتمعية في أمريكا وكندا](/club/community-colleges).
- **برامج التبادل:** [IYLEP](/club/iylep-guide)، [كليات العالم المتحدة UWC](/club/uwc-guide) و[برامج التبادل الشبابية عبر الإنترنت](/club/youth-exchange-programs).
- **الدراسة في العراق:** [الأنظمة الدراسية في الجامعات](/club/iraqi-university-systems) و[التعليم الموازي](/club/parallel-admission).
- **المهارات والعمل:** [خطواتك الأولى على الإنترنت](/club/first-steps-online)، [تطوير المواقع](/club/web-development)، [علم البيانات](/club/data-science)، [التصميم الجرافيكي](/club/graphic-design)، [كتابة الإعلانات](/club/copywriting)، [العمل عن بعد](/club/remote-work-and-freelancing) وغيرها.

## نبقيها محدّثة

المواعيد والرسوم وشروط القبول تتغيّر كل سنة، لذلك ينتهي كل دليل بروابط المصادر الرسمية. تحقّق منها دائماً قبل أن تقدّم. وإذا وجدت معلومة قديمة أو خاطئة، [راسلنا](/help#contact) ونصحّحها.

وللنقاش وطرح الأسئلة ومشاركة الفرص الجديدة أولاً بأول، انضم إلى [The IDEA Club](https://t.me/theideaiq_club) على تيليجرام.$ar$,
    $en$The IDEA Post started as a Telegram channel collecting opportunities and advice for students in Iraq: how to write an admissions essay, when to apply to exchange programs, which English test to take, and how to start a career in tech, design or writing.

Today those guides move to the **Learn** section of The IDEA Post on our website. We didn't just copy them across. We reviewed every guide, updated what has changed (such as the digital SAT and UCAS's new personal statement format), removed opportunities that have closed, and merged overlapping topics into single guides.

## Where to start

- **Studying abroad:** [a step-by-step application plan](/club/study-abroad-roadmap), [the Common App essay](/club/common-app-essay), [the UK personal statement](/club/uk-personal-statement), [GPA](/club/gpa-for-us-applications) and [the SAT](/club/sat-guide).
- **English tests:** [IELTS](/club/ielts-guide) and [the Duolingo English Test](/club/duolingo-english-test), plus [how to improve your English](/club/improve-your-english).
- **Destinations:** [Germany](/club/study-in-germany), [Türkiye](/club/study-in-turkey), [Russia](/club/study-in-russia), [American universities in the region](/club/american-universities-in-the-region) and [community colleges in the US and Canada](/club/community-colleges).
- **Exchange programs:** [IYLEP](/club/iylep-guide), [United World Colleges](/club/uwc-guide) and [online youth exchanges](/club/youth-exchange-programs).
- **Studying in Iraq:** [how Iraqi universities grade and teach](/club/iraqi-university-systems) and [parallel admission](/club/parallel-admission).
- **Skills and careers:** [your first steps online](/club/first-steps-online), [web development](/club/web-development), [data science](/club/data-science), [graphic design](/club/graphic-design), [copywriting](/club/copywriting), [remote work](/club/remote-work-and-freelancing) and more.

## Kept up to date

Deadlines, fees and admission requirements change every year, so every guide ends with links to the official sources. Always check them before you apply. If you spot something outdated or wrong, [tell us](/help#contact) and we'll fix it.

To ask questions, discuss and hear about new opportunities first, join [The IDEA Club](https://t.me/theideaiq_club) on Telegram.$en$,
    now() - interval '1 minute'
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
