-- The IDEA Post: The complete guide to IELTS (Learn)
do $do$
declare
  post_id uuid;
begin
  insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
  values (
    'ielts-guide',
    'learn',
    $ar$دليلك الكامل لاختبار IELTS$ar$,
    $en$The complete guide to IELTS$en$,
    $ar$ما هو IELTS، والفرق بين الأكاديمي والعام، وأقسام الاختبار وتوقيتها، وكيف تسجّل وتستعد.$ar$,
    $en$What IELTS is, Academic vs General Training, the four sections and their timings, and how to book and prepare.$en$,
    $ar$إذا كنت تخطّط للدراسة في جامعة خارج العراق أو للتقديم على وظيفة أو هجرة في بلد ناطق بالإنجليزية، فستحتاج غالباً إلى إثبات مستواك في اللغة. واختبار IELTS من أشهر الطرق لذلك، إلى جانب TOEFL و[Duolingo English Test](/club/duolingo-english-test).

## ما هو IELTS؟

IELTS اختصار لـ International English Language Testing System، وهو اختبار يقيس قدرتك على التواصل بالإنجليزية في الاستماع والقراءة والكتابة والمحادثة. يشترك في إدارته المجلس الثقافي البريطاني (British Council) وIDP وCambridge، وتعترف به آلاف الجامعات والمؤسسات وجهات الهجرة حول العالم، خصوصاً في بريطانيا وأستراليا وكندا ونيوزيلندا، وكثير من الجامعات الأمريكية أيضاً.

تُعطى النتيجة على مقياس من 0 إلى 9 لكل قسم، ثم تُحسب درجة إجمالية (Overall Band). معظم الجامعات تطلب بين 6.0 و7.5 بحسب البرنامج، وتحدّد أحياناً حداً أدنى لكل قسم. تحقّق دائماً من متطلبات البرنامج الذي تقدّم عليه بالضبط.

## الأكاديمي أم العام؟

- **IELTS Academic:** للدراسة الجامعية (البكالوريوس والدراسات العليا) وللتسجيل المهني في بعض المهن. يستخدم لغة أكاديمية في القراءة والكتابة.
- **IELTS General Training:** للعمل والتدريب وبعض مسارات الهجرة. يركّز على مواقف الحياة اليومية والعمل.

الفرق بين النوعين في قسمي القراءة والكتابة فقط؛ أما الاستماع والمحادثة فمتطابقان. وإذا كان هدفك الجامعة فالأكاديمي هو اختيارك في الغالب.

## أقسام الاختبار

مدة الاختبار الإجمالية نحو ساعتين و45 دقيقة.

### الاستماع (نحو 30 دقيقة، 40 سؤالاً)
أربعة تسجيلات: محادثة يومية بين شخصين، وحديث فردي عن موضوع عام، ونقاش بين عدة أشخاص في سياق دراسي، ومحاضرة أكاديمية. الأسئلة متنوعة: اختيار من متعدد، وإكمال جمل وجداول، ومطابقة، وإجابات قصيرة. تُجيب أثناء الاستماع، ولا يُعاد التسجيل.

### القراءة (60 دقيقة، 40 سؤالاً)
- **الأكاديمي:** ثلاثة نصوص طويلة من كتب ومجلات وصحف.
- **العام:** نصوص أقصر من الحياة اليومية والعمل، ثم نص أطول.

### الكتابة (60 دقيقة، مهمتان)
- **الأكاديمي:** المهمة الأولى وصف رسم بياني أو جدول أو عملية في 150 كلمة على الأقل (يُنصح بنحو 20 دقيقة)، والثانية مقالة رأي أو نقاش في 250 كلمة على الأقل (نحو 40 دقيقة).
- **العام:** المهمة الأولى رسالة (رسمية أو شبه رسمية أو شخصية)، والثانية مقالة.

### المحادثة (11 إلى 14 دقيقة)
مقابلة وجهاً لوجه مع ممتحن، وقد تكون في يوم الاختبار نفسه أو قبله أو بعده بأيام قليلة. تتكوّن من ثلاثة أجزاء:
1. أسئلة تعريفية عنك وعن مواضيع مألوفة (4 إلى 5 دقائق).
2. بطاقة بموضوع تتحدث عنه بعد دقيقة تحضير، لمدة دقيقة إلى دقيقتين.
3. نقاش أعمق مرتبط بموضوع البطاقة (4 إلى 5 دقائق).

## ورقي أم على الحاسوب؟

يمكنك في كثير من المراكز الاختيار بين الاختبار الورقي والاختبار على الحاسوب. المحتوى والتصحيح واحد، لكن نتيجة اختبار الحاسوب تصل أسرع عادة (خلال أيام قليلة). وتتيح بعض المراكز أيضاً **IELTS One Skill Retake**: إذا لم تحصل على الدرجة المطلوبة في قسم واحد، يمكنك إعادة ذلك القسم فقط دون إعادة الاختبار كله، بشرط أن يقبل ذلك الجهة التي تقدّم إليها.

وهناك أيضاً اختبار **IELTS Life Skills** للاستماع والمحادثة فقط، وهو مخصّص لبعض تأشيرات العائلة والإقامة في بريطانيا، ونتيجته نجاح أو رسوب.

## كيف تسجّل؟

1. ادخل إلى موقع ielts.org وابحث عن مراكز الاختبار القريبة منك، وتحقّق من المراكز المتاحة في العراق والمواعيد.
2. اختر النوع (أكاديمي أو عام) وطريقة الاختبار (ورقي أو حاسوب).
3. ادفع الرسوم عبر الإنترنت. تختلف الرسوم من بلد ومركز إلى آخر، وتتراوح عادة بين نحو 200 و300 دولار؛ تحقّق من السعر الحالي عند التسجيل.
4. احضر يوم الاختبار بوثيقة الهوية نفسها التي سجّلت بها (غالباً جواز السفر).

يمكنك إعادة الاختبار متى شئت إذا وُجد موعد متاح، فلا يوجد حد لعدد المرات. وتُعدّ النتيجة صالحة عادة لمدة سنتين لدى معظم الجامعات والجهات.

## كيف تستعد؟

- **اعرف مستواك أولاً:** جرّب اختباراً تجريبياً مجانياً لتعرف أين تقف وكم تحتاج من الوقت.
- **استخدم المواد الرسمية:** يوفّر موقع ielts.org والمجلس الثقافي البريطاني وIDP نماذج اختبارات مجانية وتمارين لكل قسم.
- **تدرّب بتوقيت حقيقي:** المشكلة الأكبر لدى كثيرين هي الوقت، خصوصاً في القراءة والكتابة.
- **اكتب كثيراً واطلب تصحيحاً:** في الكتابة يُقيّم الممتحن الإجابة على المهمة، وترابط الأفكار، وثراء المفردات، ودقة القواعد.
- **تحدّث بالإنجليزية يومياً:** سجّل صوتك وأنت تجيب عن أسئلة الجزء الثاني، ثم استمع وصحّح.
- **دورة أم دراسة ذاتية؟** إذا كان مستواك جيداً، فالدراسة الذاتية بالمصادر الرسمية تكفي غالباً. وإن كنت تحتاج إلى أساس أقوى، فابدأ بتطوير لغتك عموماً قبل التركيز على الاختبار؛ اقرأ دليلنا [كيف تطوّر إنجليزيتك](/club/improve-your-english).

## أيّ اختبار تختار؟

قبل أن تحجز، تأكد من أن الجامعات التي تستهدفها تقبل IELTS، وقارنه بالبدائل. يقبل كثير من الجامعات اليوم TOEFL وDuolingo English Test أيضاً، ولكلٍّ منها مزاياه؛ قارن بينها في [دليل Duolingo English Test](/club/duolingo-english-test)، وابنِ خطتك العامة بمساعدة [خطة التقديم على الدراسة في الخارج](/club/study-abroad-roadmap).

## روابط رسمية

- [الموقع الرسمي لـ IELTS](https://ielts.org)
- [البحث عن مركز اختبار](https://ielts.org/test-centres)
- [مواد تحضير مجانية من British Council](https://takeielts.britishcouncil.org/take-ielts/prepare)
- [IELTS من IDP](https://ielts.idp.com)$ar$,
    $en$If you plan to study at a university outside Iraq, or to apply for work or immigration in an English-speaking country, you'll usually need to prove your English. IELTS is one of the most common ways to do that, alongside TOEFL and the [Duolingo English Test](/club/duolingo-english-test).

## What is IELTS?

IELTS stands for International English Language Testing System. It measures how well you communicate in English across listening, reading, writing and speaking. It's run jointly by the British Council, IDP and Cambridge, and it's accepted by thousands of universities, employers and immigration authorities worldwide, especially in the UK, Australia, Canada and New Zealand, and by many US universities too.

Each section is scored on a band scale from 0 to 9, and you get an overall band. Most universities ask for 6.0 to 7.5 depending on the program, sometimes with a minimum per section. Always check the exact requirement of the program you're applying to.

## Academic or General Training?

- **IELTS Academic:** for university study (undergraduate and postgraduate) and some professional registrations. The reading and writing use academic language.
- **IELTS General Training:** for work, training and some immigration routes. It focuses on everyday and workplace situations.

The two differ only in reading and writing; listening and speaking are identical. If your goal is university, Academic is almost always the one you need.

## The four sections

The whole test takes about 2 hours 45 minutes.

### Listening (about 30 minutes, 40 questions)
Four recordings: an everyday conversation between two people, a monologue on a general topic, a discussion between several people in a study setting, and an academic lecture. Question types include multiple choice, sentence and table completion, matching and short answers. You answer while you listen, and each recording plays once.

### Reading (60 minutes, 40 questions)
- **Academic:** three long passages from books, journals and newspapers.
- **General Training:** shorter everyday and workplace texts, then one longer passage.

### Writing (60 minutes, two tasks)
- **Academic:** Task 1 describes a graph, table, chart or process in at least 150 words (about 20 minutes); Task 2 is an opinion or discussion essay of at least 250 words (about 40 minutes).
- **General Training:** Task 1 is a letter (formal, semi-formal or personal); Task 2 is an essay.

### Speaking (11 to 14 minutes)
A face-to-face interview with an examiner, either on test day or a few days before or after. It has three parts:
1. Introductory questions about you and familiar topics (4 to 5 minutes).
2. A cue card: one minute to prepare, then speak for one to two minutes.
3. A deeper discussion linked to the cue card topic (4 to 5 minutes).

## Paper or computer?

Many centers let you choose between paper and computer-delivered IELTS. The content and marking are the same, but computer results usually arrive faster, within a few days. Some centers also offer **IELTS One Skill Retake**: if you miss your target in one section, you can retake just that section instead of the whole test, provided the institution you're applying to accepts it.

There's also **IELTS Life Skills**, which tests only listening and speaking. It's used for some UK family and settlement visas and is graded pass or fail.

## How to book

1. Go to ielts.org and search for test centers near you, including the centers currently available in Iraq and their dates.
2. Choose the module (Academic or General Training) and format (paper or computer).
3. Pay online. Fees vary by country and center and are usually somewhere around US$200–300; check the current price when you book.
4. On test day, bring the same identity document you registered with (usually your passport).

You can take the test again whenever there's an available date; there's no limit on attempts. Results are generally accepted for two years by most universities and organizations.

## How to prepare

- **Find your level first:** take a free practice test to see where you stand and how much time you need.
- **Use official materials:** ielts.org, the British Council and IDP all offer free practice tests and exercises for each section.
- **Practice under real timing:** time is the biggest problem for most candidates, especially in reading and writing.
- **Write a lot and get feedback:** writing is assessed on task response, coherence, vocabulary range and grammatical accuracy.
- **Speak English every day:** record yourself answering Part 2 questions, then listen back and improve.
- **Course or self-study?** If your English is already good, self-study with official materials is usually enough. If you need a stronger base, work on your English in general before focusing on the test; see our guide [how to improve your English](/club/improve-your-english).

## Which test should you take?

Before you book, make sure the universities you're targeting accept IELTS, and compare it with the alternatives. Many universities now accept TOEFL and the Duolingo English Test too, and each has its advantages; compare them in our [Duolingo English Test guide](/club/duolingo-english-test), and build your overall plan with our [study abroad roadmap](/club/study-abroad-roadmap).

## Official links

- [IELTS official website](https://ielts.org)
- [Find a test center](https://ielts.org/test-centres)
- [Free preparation from the British Council](https://takeielts.britishcouncil.org/take-ielts/prepare)
- [IELTS by IDP](https://ielts.idp.com)$en$,
    now() - interval '11 minutes'
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
