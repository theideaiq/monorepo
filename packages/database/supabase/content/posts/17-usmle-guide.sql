-- The IDEA Post: The USMLE explained for medical students in Iraq (Learn)
do $do$
declare
  post_id uuid;
begin
  insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
  values (
    'usmle-guide',
    'learn',
    $ar$اختبار USMLE: دليل طلبة الطب في العراق$ar$,
    $en$The USMLE explained for medical students in Iraq$en$,
    $ar$الخطوات الثلاث لامتحان ترخيص الطب الأمريكي، وما يغطيه كل منها، ومتى تقدّم، وأشهر مصادر الدراسة.$ar$,
    $en$The three steps of the US medical licensing exam, what each covers, when to take them, and the best-known study resources.$en$,
    $ar$اختبار USMLE (United States Medical Licensing Examination) هو امتحان ترخيص ممارسة الطب في الولايات المتحدة. كل طبيب يريد العمل أو التخصص (الإقامة الطبية) في أمريكا يحتاج إلى اجتيازه ليثبت أنه يستوفي المعايير العلمية والسريرية المطلوبة. وتعترف بنتائجه أيضاً جهات في دول أخرى، مثل بعض دول الخليج. يتكوّن من ثلاث خطوات.

## قبل أن تبدأ: الاعتراف بكليتك

يسجّل خريجو كليات الطب خارج أمريكا عبر مؤسسة ECFMG. ومنذ 2024، يُشترط أن تكون كلية الطب معتمدة من جهة اعتماد معترف بها لدى الاتحاد العالمي للتعليم الطبي (WFME). تحقّق من وضع كليتك في دليل World Directory of Medical Schools ومن متطلبات ECFMG قبل أن تبدأ.

## الخطوة الأولى (Step 1)

تغطي العلوم الأساسية التي تدرسها غالباً في المراحل الأولى من كلية الطب، مع التركيز على فهم آليات المرض:
Pathology، Physiology، Pharmacology، Biochemistry، Microbiology، Immunology، Anatomy، Histology and Cell Biology، Behavioral Sciences، Genetics. وعلم الأمراض (Pathology) يحتل جزءاً كبيراً من الأسئلة.

- **الشكل:** أسئلة اختيار من متعدد، حتى 280 سؤالاً موزّعة على 7 أقسام، لكل قسم ساعة، مع وقت استراحة إجمالي يمكنك توزيعه.
- **النتيجة:** منذ 2022 أصبحت **نجاحاً أو رسوباً** فقط، دون درجة رقمية.
- **المكان:** في مراكز Prometric داخل أمريكا وفي دول كثيرة خارجها، منها دول عربية وتركيا. تحقّق من المراكز المتاحة عند التسجيل.
- **التوقيت:** يمكنك التقدّم وأنت طالب أو بعد التخرج. يبدأ كثيرون الدراسة بعد إنهاء العلوم الأساسية، ويقدّمون بعد المرحلة الرابعة تقريباً.

## الخطوة الثانية (Step 2 CK)

تختبر قدرتك على تطبيق المعرفة الطبية في التشخيص والعلاج، مع التركيز على:
Internal Medicine، Obstetrics and Gynecology، Pediatrics، Preventive Medicine، Psychiatry، Surgery.

- **الشكل:** أسئلة اختيار من متعدد، حتى 318 سؤالاً موزّعة على 8 أقسام، مع ساعة استراحة إجمالية تقريباً، في يوم طويل.
- **النتيجة:** درجة رقمية، وكانت درجة النجاح 218 عند كتابة هذا الدليل. تراجع درجة النجاح دورياً، فتحقّق منها على usmle.org.
- **التوقيت:** غالباً في المراحل السريرية الأخيرة أو بعد التخرج.

ملاحظة: الامتحان السريري القديم Step 2 CS أُلغي، ويُقيَّم التواصل والمهارات السريرية اليوم بطرق أخرى ضمن مسار ECFMG.

## الخطوة الثالثة (Step 3)

تقيس جاهزيتك للممارسة المستقلة دون إشراف.
- **الشكل:** يومان (ليس بالضرورة متتاليين). اليوم الأول أسئلة اختيار من متعدد عن أسس الممارسة. اليوم الثاني أسئلة اختيار من متعدد إضافة إلى **محاكاة حالات سريرية (CCS)**، تتعامل فيها مع مريض افتراضي: تطلب الفحوص وتضع الخطة وتتابع الحالة.
- **المكان:** داخل الولايات المتحدة فقط، وبعد التخرج.

## الرسوم

رسوم كل خطوة مرتفعة، وتضاف إليها رسوم تسجيل ECFMG ورسوم للاختبار خارج أمريكا، وهي تتغيّر سنوياً. لا تخطّط بأرقام قديمة؛ راجع صفحة الرسوم على موقع ECFMG. ولا تشمل هذه الرسوم السفر أو السكن.

## مصادر الدراسة الشائعة

- **مراجع أساسية:** First Aid for the USMLE Step 1 (للمراجعة)، Pathoma، ومحاضرات Kaplan.
- **بنوك الأسئلة:** UWorld هو الأشهر، إلى جانب AMBOSS وأسئلة NBME التجريبية الرسمية لقياس الجاهزية.
- **التكرار المتباعد:** بطاقات Anki لتثبيت المعلومات.
- **الاختبارات التجريبية الرسمية:** من NBME وUSMLE، لتعرف مستواك قبل الموعد.

## نصائح

- ابدأ مبكراً، وادرس بانتظام بدل الدراسة المكثفة في الأسابيع الأخيرة.
- اجعل بنك الأسئلة محور دراستك، واقرأ شرح كل إجابة، الصحيحة والخاطئة.
- كوّن مجموعة دراسة مع زملاء يستهدفون الاختبار نفسه.
- اهتم بلغتك الإنجليزية؛ الأسئلة طويلة وتعتمد على قراءة سريعة ودقيقة. اقرأ [كيف تطوّر إنجليزيتك](/club/improve-your-english).
- نظّم وقتك بين الكلية والتحضير: [إدارة الوقت](/club/time-management).

## روابط رسمية

- [الموقع الرسمي لـ USMLE](https://www.usmle.org)
- [ECFMG: التسجيل والرسوم وشروط الاعتماد](https://www.ecfmg.org)
- [NBME: اختبارات تجريبية](https://www.nbme.org)
- [World Directory of Medical Schools](https://search.wdoms.org)$ar$,
    $en$The USMLE (United States Medical Licensing Examination) is the licensing exam for practicing medicine in the US. Every doctor who wants to work or train (residency) in the US has to pass it to show they meet the required scientific and clinical standards, and its results are recognized by some other countries too, including some in the Gulf. It has three steps.

## Before you start: your school's recognition

Graduates of medical schools outside the US register through ECFMG. Since 2024, your medical school must be accredited by an agency recognized by the World Federation for Medical Education (WFME). Check your school's status in the World Directory of Medical Schools and ECFMG's requirements before you begin.

## Step 1

Covers the basic sciences you usually study in the early years of medical school, with a focus on the mechanisms of disease:
Pathology, Physiology, Pharmacology, Biochemistry, Microbiology, Immunology, Anatomy, Histology and Cell Biology, Behavioral Sciences and Genetics. Pathology makes up a large share of the questions.

- **Format:** multiple-choice, up to 280 questions in 7 one-hour blocks, with a total break time you can split between blocks.
- **Result:** since 2022, **pass or fail** only, with no numeric score.
- **Where:** at Prometric centers in the US and in many other countries, including several Arab countries and Türkiye. Check available centers when you register.
- **When:** you can take it as a student or after graduating. Many start studying after finishing the basic sciences and sit the exam around the end of fourth year.

## Step 2 CK

Tests how you apply medical knowledge to diagnosis and treatment, focusing on:
Internal Medicine, Obstetrics and Gynecology, Pediatrics, Preventive Medicine, Psychiatry and Surgery.

- **Format:** multiple-choice, up to 318 questions in 8 blocks, with about an hour of total break time, in one long day.
- **Result:** a numeric score; the passing score was 218 at the time of writing. The passing standard is reviewed periodically, so check usmle.org.
- **When:** usually in the final clinical years or after graduating.

Note: the old clinical skills exam, Step 2 CS, has been discontinued; communication and clinical skills are now assessed in other ways within the ECFMG pathway.

## Step 3

Measures whether you're ready for unsupervised practice.
- **Format:** two days (not necessarily consecutive). Day one is multiple-choice on the foundations of practice. Day two adds more multiple-choice questions and **computer-based case simulations (CCS)**, where you manage a virtual patient: order tests, set a plan and follow the case.
- **Where:** in the United States only, after graduating.

## Fees

Each step is expensive, and there are also ECFMG registration fees and a surcharge for testing outside the US, all of which change yearly. Don't plan with old numbers; check the fees page on ECFMG's website. These fees don't include travel or accommodation.

## Common study resources

- **Core resources:** First Aid for the USMLE Step 1 (for review), Pathoma and Kaplan lectures.
- **Question banks:** UWorld is the best known, alongside AMBOSS and the official NBME practice exams to gauge readiness.
- **Spaced repetition:** Anki flashcards to make knowledge stick.
- **Official practice exams:** from NBME and USMLE, to know where you stand before test day.

## Tips

- Start early and study steadily instead of cramming in the final weeks.
- Make a question bank the core of your study, and read the explanation for every answer, right and wrong.
- Form a study group with classmates aiming for the same exam.
- Work on your English; questions are long and reward fast, accurate reading. See [how to improve your English](/club/improve-your-english).
- Balance medical school and exam prep: [time management](/club/time-management).

## Official links

- [USMLE official site](https://www.usmle.org)
- [ECFMG: registration, fees and accreditation requirements](https://www.ecfmg.org)
- [NBME: practice exams](https://www.nbme.org)
- [World Directory of Medical Schools](https://search.wdoms.org)$en$,
    now() - interval '17 minutes'
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
