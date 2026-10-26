-- The IDEA Post: The UK personal statement (UCAS) (Learn)
do $do$
declare
  post_id uuid;
begin
  insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
  values (
    'uk-personal-statement',
    'learn',
    $ar$البيان الشخصي للتقديم على بريطانيا عبر UCAS$ar$,
    $en$The UK personal statement: applying through UCAS$en$,
    $ar$ثلاثة أسئلة و4,000 حرف: كيف تثبت للجامعات البريطانية أنك جاهز للتخصص الذي اخترته.$ar$,
    $en$Three questions and 4,000 characters: how to show UK universities you're ready for the course you chose.$en$,
    $ar$للتقديم على البكالوريوس في المملكة المتحدة، تقدّم طلباً واحداً عبر [UCAS](https://www.ucas.com) يصل إلى عدة جامعات، ومعه **بيان شخصي** (Personal Statement). وعلى عكس مقالة Common App الأمريكية التي تطلب قصة شخصية، البيان البريطاني مباشر ويدور حول تخصصك: لماذا تريده، وما الذي جهّزك له.

## الصيغة الجديدة: ثلاثة أسئلة

ابتداءً من التقديم للدراسة في 2026، استبدلت UCAS البيان الحر بثلاثة أسئلة تجيب عنها:

1. **Why do you want to study this course or subject?** لماذا تريد دراسة هذا التخصص؟
2. **How have your qualifications and studies helped you to prepare for this course or subject?** كيف ساعدتك دراستك ومؤهلاتك على الاستعداد له؟
3. **What else have you done to prepare outside of education, and why are these experiences useful?** ماذا فعلت خارج الدراسة لتستعد، ولماذا هذه التجارب مفيدة؟

المجموع ما زال **4,000 حرف** (تُحسب المسافات وعلامات الترقيم)، وكل إجابة لا تقل عن **350 حرفاً**. تحقق من التفاصيل الحالية في [صفحة UCAS الرسمية](https://www.ucas.com/applying/applying-to-university/writing-your-personal-statement) قبل أن تكتب.

## ما الذي يجب أن يظهر في إجاباتك

- لماذا يهمك هذا التخصص، وما الذي ألهمك، وما تعرفه عنه.
- المجالات التي تشدّك داخل التخصص.
- قراءات خارج المنهج وما تعلّمته منها.
- ما تأمل تحقيقه من الدراسة.
- خبرة عمل أو أنشطة أو مؤهلات ذات صلة، وكيف ترتبط بالتخصص.
- إنجازات وهوايات تُظهر اهتمامك بالمجال.

## قاعدة 80/20

اجعل نحو **80%** من البيان عن التخصص وتحصيلك الأكاديمي، و**20%** عن "لماذا أنا": أنشطتك ومهاراتك. وفي كل مثال اتّبع التسلسل نفسه: **النشاط ← ما استفدته ← صلته بالتخصص ← المهارة أو الصفة التي يُظهرها.**

## لبنات أساسية لإثبات دافعك

اختر قصصاً محددة من هذه اللبنات:

- الدراسة الأكاديمية والبحث.
- انخراط أكاديمي أوسع: قراءة خارج المدرسة، دورات عبر الإنترنت، محاضرات.
- خبرة عمل ذات صلة: تدريب، وظيفة، مرافقة مهنية (Job shadowing).
- أنشطة مرتبطة مباشرة بالتخصص: الأولمبياد العلمي، التطوع في مستشفى لمن يريد الطب، العمل مع النازحين لمن يريد العلاقات الدولية أو العلوم السياسية.
- أنشطة مرتبطة بشكل غير مباشر طوّرت مهارات أو صفات تجعلك طالباً جيداً في هذا التخصص.

## الأنشطة والمهارات (الـ20%)

**أنشطة:** النشاط المجتمعي والتغيير الاجتماعي، حملات التوعية وجمع التبرعات، الخدمة التطوعية، الرياضة، المواهب الإبداعية من فنون بصرية أو أدائية، أنشطة خارج المدرسة، الرحلات المدرسية وغيرها، التجربة الدولية، إتقان عدة لغات.

**مهارات وصفات:** العمل الجماعي والقيادة، إدارة الوقت والتنظيم، حل المشكلات والتفكير التحليلي، التواصل والعرض، المهارات التقنية والبحثية، المبادرة والابتكار والإبداع، المرونة والإصرار، التعاطف، الشغف والحماس، الثقة بالنفس.

لا تكتفِ بذكر المهارة؛ أعطِ مثالاً يثبتها.

## للطلبة الدوليين

يُنصح الطلبة الدوليون بأن يجيبوا ضمن إجاباتهم عن:

- لماذا تريد الدراسة في المملكة المتحدة تحديداً؟
- مستواك في الإنجليزية، والدورات أو الاختبارات التي أخذتها (مثل [IELTS](/club/ielts-guide)).
- لماذا تريد الدراسة طالباً دولياً بدل الدراسة في بلدك؟

## نصائح للكتابة

- اكتب كل إجابة في مستند أولاً، وراقب عدد الحروف.
- كن محدداً: اسم الكتاب، والتجربة، وما تعلّمته منها.
- ابدأ مبكراً، واكتب عدة مسودات، واطلب رأي مدرّس.
- لا تنسخ من الإنترنت؛ UCAS تفحص التشابه.

## روابط رسمية

- [UCAS: كتابة البيان الشخصي](https://www.ucas.com/applying/applying-to-university/writing-your-personal-statement)
- [UCAS: تعبئة طلب البكالوريوس](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application)
- [UCAS](https://www.ucas.com)

اقرأ أيضاً: [خطة التقديم للدراسة في الخارج](/club/study-abroad-roadmap) و[مقالة Common App](/club/common-app-essay).$ar$,
    $en$To apply for an undergraduate degree in the UK, you submit one application through [UCAS](https://www.ucas.com) that goes to several universities, together with a **personal statement**. Unlike the US Common App essay, which asks for a personal story, the UK statement is direct and centered on your subject: why you want it and what has prepared you for it.

## The new format: three questions

For courses starting in 2026 onward, UCAS replaced the free-form statement with three questions:

1. **Why do you want to study this course or subject?**
2. **How have your qualifications and studies helped you to prepare for this course or subject?**
3. **What else have you done to prepare outside of education, and why are these experiences useful?**

The total is still **4,000 characters** (spaces and punctuation count), with at least **350 characters** per answer. Check the current details on [UCAS's official page](https://www.ucas.com/applying/applying-to-university/writing-your-personal-statement) before you write.

## What your answers should show

- Why you're interested in the subject, what inspired you, and what you know about it.
- The areas within the subject that interest you most.
- Reading beyond the syllabus and what you learned from it.
- What you hope to achieve through the course.
- Relevant work experience, activities or qualifications, and how they relate to the subject.
- Achievements and hobbies that show your interest in the field.

## The 80/20 rule

Spend about **80%** on the subject and your academic preparation, and **20%** on "why me": your activities and skills. For each example, follow the same chain: **activity → what you gained → how it relates to the course → the skill or quality it shows.**

## Building blocks to prove your motivation

Pick specific stories from these:

- Academics and research.
- Wider academic engagement: reading outside school, online courses, lectures.
- Relevant work experience: internships, jobs, job shadowing.
- Activities directly related to the subject: science olympiads, volunteering at a hospital for medicine, working with displaced people for international relations or politics.
- Indirectly related activities that built skills or qualities that would make you a good student on this course.

## Activities and skills (the 20%)

**Activities:** activism and social change, awareness-raising and fundraising, service, sports, creative talent in visual or performing arts, activities outside school, school and other trips, international experience, multilingualism.

**Skills and qualities:** teamwork and leadership, time management and organization, problem-solving and analytical thinking, communication and presentation, technical and research skills, initiative and creativity, resilience and determination, compassion and empathy, passion and drive, confidence.

Don't just name a skill; give an example that proves it.

## For international students

International applicants are advised to address, within their answers:

- Why you want to study in the UK specifically.
- Your English level and any courses or tests you've taken (such as [IELTS](/club/ielts-guide)).
- Why you want to be an international student rather than study in your own country.

## Writing tips

- Draft each answer in a document first and watch the character count.
- Be specific: the book, the experience, and what you learned from it.
- Start early, write several drafts, and ask a teacher for feedback.
- Don't copy from the internet; UCAS checks for similarity.

## Official links

- [UCAS: writing your personal statement](https://www.ucas.com/applying/applying-to-university/writing-your-personal-statement)
- [UCAS: filling in your undergraduate application](https://www.ucas.com/applying/applying-to-university/filling-in-your-ucas-application)
- [UCAS](https://www.ucas.com)

See also: our [study abroad roadmap](/club/study-abroad-roadmap) and the [Common App essay](/club/common-app-essay).$en$,
    now() - interval '5 minutes'
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
