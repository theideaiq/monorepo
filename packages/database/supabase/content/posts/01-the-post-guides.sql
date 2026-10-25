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

- **الدراسة في الخارج:** [خطة التقديم خطوة بخطوة](/post/study-abroad-roadmap)، [مقالة Common App](/post/common-app-essay)، [البيان الشخصي لبريطانيا](/post/uk-personal-statement)، [المعدل التراكمي GPA](/post/gpa-for-us-applications) و[دليل SAT](/post/sat-guide).
- **اختبارات اللغة:** [IELTS](/post/ielts-guide) و[Duolingo English Test](/post/duolingo-english-test)، و[كيف تطوّر إنجليزيتك](/post/improve-your-english).
- **الوجهات:** [ألمانيا](/post/study-in-germany)، [تركيا](/post/study-in-turkey)، [روسيا](/post/study-in-russia)، [الجامعات الأمريكية في المنطقة](/post/american-universities-in-the-region) و[الكليات المجتمعية في أمريكا وكندا](/post/community-colleges).
- **برامج التبادل:** [IYLEP](/post/iylep-guide)، [كليات العالم المتحدة UWC](/post/uwc-guide) و[برامج التبادل الشبابية عبر الإنترنت](/post/youth-exchange-programs).
- **الدراسة في العراق:** [الأنظمة الدراسية في الجامعات](/post/iraqi-university-systems) و[التعليم الموازي](/post/parallel-admission).
- **المهارات والعمل:** [خطواتك الأولى على الإنترنت](/post/first-steps-online)، [تطوير المواقع](/post/web-development)، [علم البيانات](/post/data-science)، [التصميم الجرافيكي](/post/graphic-design)، [كتابة الإعلانات](/post/copywriting)، [العمل عن بعد](/post/remote-work-and-freelancing) وغيرها.

## نبقيها محدّثة

المواعيد والرسوم وشروط القبول تتغيّر كل سنة، لذلك ينتهي كل دليل بروابط المصادر الرسمية. تحقّق منها دائماً قبل أن تقدّم. وإذا وجدت معلومة قديمة أو خاطئة، [راسلنا](/about/contact) ونصحّحها.

وللنقاش وطرح الأسئلة ومشاركة الفرص الجديدة أولاً بأول، انضم إلى [The IDEA Club](https://t.me/theideaclub) على تيليجرام.$ar$,
    $en$The IDEA Post started as a Telegram channel collecting opportunities and advice for students in Iraq: how to write an admissions essay, when to apply to exchange programs, which English test to take, and how to start a career in tech, design or writing.

Today those guides move to the **Learn** section of The IDEA Post on our website. We didn't just copy them across. We reviewed every guide, updated what has changed (such as the digital SAT and UCAS's new personal statement format), removed opportunities that have closed, and merged overlapping topics into single guides.

## Where to start

- **Studying abroad:** [a step-by-step application plan](/post/study-abroad-roadmap), [the Common App essay](/post/common-app-essay), [the UK personal statement](/post/uk-personal-statement), [GPA](/post/gpa-for-us-applications) and [the SAT](/post/sat-guide).
- **English tests:** [IELTS](/post/ielts-guide) and [the Duolingo English Test](/post/duolingo-english-test), plus [how to improve your English](/post/improve-your-english).
- **Destinations:** [Germany](/post/study-in-germany), [Türkiye](/post/study-in-turkey), [Russia](/post/study-in-russia), [American universities in the region](/post/american-universities-in-the-region) and [community colleges in the US and Canada](/post/community-colleges).
- **Exchange programs:** [IYLEP](/post/iylep-guide), [United World Colleges](/post/uwc-guide) and [online youth exchanges](/post/youth-exchange-programs).
- **Studying in Iraq:** [how Iraqi universities grade and teach](/post/iraqi-university-systems) and [parallel admission](/post/parallel-admission).
- **Skills and careers:** [your first steps online](/post/first-steps-online), [web development](/post/web-development), [data science](/post/data-science), [graphic design](/post/graphic-design), [copywriting](/post/copywriting), [remote work](/post/remote-work-and-freelancing) and more.

## Kept up to date

Deadlines, fees and admission requirements change every year, so every guide ends with links to the official sources. Always check them before you apply. If you spot something outdated or wrong, [tell us](/about/contact) and we'll fix it.

To ask questions, discuss and hear about new opportunities first, join [The IDEA Club](https://t.me/theideaclub) on Telegram.$en$,
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
