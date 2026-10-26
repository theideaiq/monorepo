-- The IDEA Post: Data science: what it is and how to get in (Learn)
do $do$
declare
  post_id uuid;
begin
  insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
  values (
    'data-science',
    'learn',
    $ar$علم البيانات: ما هو وكيف تدخل المجال؟$ar$,
    $en$Data science: what it is and how to get in$en$,
    $ar$الفرق بين عالم البيانات ومحلّلها ومهندسها، والمهارات التي تحتاجها، ودورات ومواقع وكتب تساعدك على البدء.$ar$,
    $en$How data scientists, analysts and engineers differ, the skills you need, and the courses, sites and books that help you start.$en$,
    $ar$علم البيانات (Data Science) هو كل ما يتعلّق باستخراج البيانات وتنظيفها وتحليلها وتصويرها وإدارتها، بهدف مساعدة المؤسسات على اتخاذ قرارات مبنية على أدلّة. يتعامل مع البيانات المنظّمة (كجداول قواعد البيانات) وغير المنظّمة (كالنصوص والصور)، ويجمع بين الإحصاء والرياضيات وعلوم الحاسوب.

ستجد تطبيقاته في كل مكان: محرّك بحث Google، وتصفية البريد المزعج في Gmail، والتدقيق الإملائي، وتوصيات المسلسلات، وفي الرعاية الصحية والخدمات اللوجستية والمالية والأمن الإلكتروني. ولهذا هو من أكثر المجالات طلباً وأعلاها أجراً.

## ثلاثة أدوار متقاربة

- **محلّل البيانات (Data Analyst):** يشرح ما حدث. يعمل على بيانات موجودة واستبيانات وإحصاءات، ويحوّلها إلى تقارير ولوحات معلومات تجيب عن أسئلة العمل.
- **عالم البيانات (Data Scientist):** يتنبّأ بما سيحدث. يبني نماذج وخوارزميات تصنيف وتنبّؤ، غالباً باستخدام التعلّم الآلي، لتفسير الماضي والحاضر واستشراف المستقبل.
- **مهندس البيانات (Data Engineer):** يبني الأنابيب. يصمّم ويدير البنية التحتية التي تجمع كميات هائلة من البيانات المتغيّرة بسرعة، وينقلها وينظّفها حتى تصل جاهزة لعلماء البيانات والمحلّلين.

كثير من الناس يبدؤون محلّلين ثم ينتقلون إلى علم البيانات بعد اكتساب الخبرة.

## ماذا تحتاج لتدخل المجال؟

المجال واسع، وستحتاج أن تبني نفسك في أكثر من اتجاه:

- **الرياضيات:** الإحصاء والاحتمالات، والجبر الخطي، وأساسيات التفاضل.
- **البرمجة:** **Python** هي اللغة الأشهر في المجال، ومعها مكتبات مثل pandas وNumPy وscikit-learn. ولغة **R** شائعة في الإحصاء والبحث العلمي.
- **قواعد البيانات:** **SQL** ضرورية لكل الأدوار الثلاثة.
- **الأدوات:** **Excel** وأدوات التصوير مثل Power BI وTableau. Excel ليس لغة برمجة، لكنه أداة يستخدمها المحلّلون يومياً.
- **التعلّم الآلي:** فهم الخوارزميات الأساسية ومتى تستخدم كلاً منها.
- **مهارات التواصل:** تحويل الأرقام إلى قصة يفهمها أصحاب القرار مهارة لا تقل أهمية عن التحليل نفسه.

نصيحة: الدورات المتفرّقة وحدها قد تترك فجوات كبيرة. اتبع برنامجاً منظّماً (Structured Program) يأخذك من الأساسيات إلى المشاريع، ولا تحاول تعلّم كل شيء دفعة واحدة. وإن أردت أن تتعلّم أسرع، فاقرأ [تقنيات التعلّم الفعّال](/club/learn-faster).

## طبّق ما تتعلّمه

أفضل طريقة لإثبات مهارتك هي المشاريع: حلّل مجموعة بيانات حقيقية، وشارك في مسابقات Kaggle، وانشر عملك على GitHub مع شرح واضح لما فعلته ولماذا. هذا المعرض أهم من أي شهادة عند التقدّم لوظيفة.

## مصادر للتعلّم

**دورات (على Coursera، ويمكنك التقدّم للمساعدة المالية Financial Aid لدراستها مجاناً):**

- [Google Data Analytics Professional Certificate](https://www.coursera.org/professional-certificates/google-data-analytics)
- [IBM Data Analyst Professional Certificate](https://www.coursera.org/professional-certificates/ibm-data-analyst)
- [IBM Data Science Professional Certificate](https://www.coursera.org/professional-certificates/ibm-data-science)
- [Data Science Specialization من Johns Hopkins](https://www.coursera.org/specializations/jhu-data-science)
- [Learning from Data من Caltech](https://work.caltech.edu/telecourse): مقدمة رصينة في التعلّم الآلي.

**مواقع:**

- [Kaggle](https://www.kaggle.com): مجموعات بيانات ومسابقات ودورات قصيرة مجانية.
- [Machine Learning Mastery](https://machinelearningmastery.com): شروحات عملية.
- [Towards Data Science](https://towardsdatascience.com): مقالات من ممارسين.
- [GitHub](https://github.com): مشاريع مفتوحة تتعلّم منها.

**كتب:**

- Head First Statistics
- Practical Statistics for Data Scientists
- Introduction to Machine Learning with Python
- Data Science and Big Data Analytics

ولأن البيانات تُخزَّن وتُعالَج غالباً في السحابة، اقرأ أيضاً دليل [الحوسبة السحابية](/club/cloud-computing).$ar$,
    $en$Data science covers extracting, cleaning, analyzing, visualizing and managing data so organizations can make evidence-based decisions. It works with structured data (like database tables) and unstructured data (like text and images), and it draws on statistics, mathematics and computer science.

You'll find it everywhere: Google Search, Gmail's spam filter, spell check, streaming recommendations, and in healthcare, logistics, finance and cybersecurity. That's why it's one of the most in-demand and best-paid fields.

## Three related roles

- **Data analyst:** explains what happened. Works with existing data, surveys and statistics, turning them into reports and dashboards that answer business questions.
- **Data scientist:** predicts what will happen. Builds classification and forecasting models and algorithms, often with machine learning, to explain the past and present and anticipate the future.
- **Data engineer:** builds the pipelines. Designs and runs the infrastructure that collects huge volumes of fast-changing data, moves it and cleans it so it arrives ready for scientists and analysts.

Many people start as analysts and move into data science once they've gained experience.

## What you need

The field is broad, so you'll be building yourself up in several directions:

- **Math:** statistics and probability, linear algebra and basic calculus.
- **Programming:** **Python** is the field's most popular language, with libraries like pandas, NumPy and scikit-learn. **R** is common in statistics and research.
- **Databases:** **SQL** is essential for all three roles.
- **Tools:** **Excel** and visualization tools like Power BI and Tableau. Excel isn't a programming language, but analysts use it every day.
- **Machine learning:** the core algorithms and when to use each.
- **Communication:** turning numbers into a story decision-makers understand matters as much as the analysis itself.

A tip: scattered courses alone can leave big gaps. Follow a structured program that takes you from the basics to real projects, and don't try to learn everything at once. To learn faster, read our guide to [effective learning techniques](/club/learn-faster).

## Put it into practice

Projects are the best proof of skill: analyze a real dataset, enter Kaggle competitions, and publish your work on GitHub with a clear explanation of what you did and why. That portfolio counts for more than any certificate when you apply for a job.

## Where to learn

**Courses (on Coursera; you can apply for Financial Aid to take them for free):**

- [Google Data Analytics Professional Certificate](https://www.coursera.org/professional-certificates/google-data-analytics)
- [IBM Data Analyst Professional Certificate](https://www.coursera.org/professional-certificates/ibm-data-analyst)
- [IBM Data Science Professional Certificate](https://www.coursera.org/professional-certificates/ibm-data-science)
- [Johns Hopkins Data Science Specialization](https://www.coursera.org/specializations/jhu-data-science)
- [Caltech's Learning from Data](https://work.caltech.edu/telecourse): a rigorous introduction to machine learning.

**Sites:**

- [Kaggle](https://www.kaggle.com): datasets, competitions and free short courses.
- [Machine Learning Mastery](https://machinelearningmastery.com): practical tutorials.
- [Towards Data Science](https://towardsdatascience.com): articles by practitioners.
- [GitHub](https://github.com): open projects to learn from.

**Books:**

- Head First Statistics
- Practical Statistics for Data Scientists
- Introduction to Machine Learning with Python
- Data Science and Big Data Analytics

Since data is usually stored and processed in the cloud, read our guide to [cloud computing](/club/cloud-computing) too.$en$,
    now() - interval '30 minutes'
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
