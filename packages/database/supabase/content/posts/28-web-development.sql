-- The IDEA Post: Web development: where to start (Learn)
do $do$
declare
  post_id uuid;
begin
  insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
  values (
    'web-development',
    'learn',
    $ar$تطوير المواقع: من أين تبدأ؟$ar$,
    $en$Web development: where to start$en$,
    $ar$الواجهة الأمامية والخلفية، واللغات والأطر الأساسية، ومسارات تعلّم مجانية، وقائمة بأهم مستودعات GitHub للمطوّرين.$ar$,
    $en$Front end and back end, the core languages and frameworks, free learning paths, and the GitHub repositories every developer should know.$en$,
    $ar$تطوير المواقع (Web Development) من أكثر مجالات البرمجة طلباً في سوق العمل، ومن أسهلها دخولاً لمن يبدأ وحده. يشمل كل ما يتعلّق ببناء مواقع الويب وتطبيقاته وتصميمها، سواء كانت مواقع تعريفية بسيطة أو تطبيقات تفاعلية كاملة، إضافة إلى صيانتها وتطويرها مع الوقت.

## جبل الجليد: الواجهة الأمامية والخلفية

تخيّل الموقع جبلَ جليد في البحر. الجزء الظاهر فوق الماء هو **الواجهة الأمامية (Front-end)**، والجزء الأكبر المخفي تحت الماء هو **الواجهة الخلفية (Back-end)**.

### الواجهة الأمامية (Front-end)

هي كل ما يراه المستخدم ويتفاعل معه: التصميم والألوان والخطوط والقوائم والأزرار وطريقة ترتيب المحتوى على الشاشات المختلفة. يحتاج مطوّر الواجهة الأمامية إلى:

- فهم جيد لأساسيات التصميم وأدوات مثل Figma، حتى يحوّل التصاميم إلى صفحات حقيقية.
- كتابة كود واضح ومنظّم وسهل الصيانة.
- الاهتمام بتجربة المستخدم وسهولة الوصول (Accessibility) والأداء.

أدواته الأساسية:

- **HTML:** لغة ترميز تبني هيكل الصفحة ومحتواها.
- **CSS:** لغة تنسيق تتحكّم في الشكل والألوان والتخطيط.
- **JavaScript:** لغة البرمجة التي تجعل الصفحة تفاعلية وتولّد محتوى ديناميكياً.

بدقّة، HTML وCSS ليستا لغتي برمجة بالمعنى الكامل، بل لغتا ترميز وتنسيق، لكنهما أساس لا غنى عنه. وفوق JavaScript تأتي **مكتبات وأطر** مثل **React** و**Vue.js** و**Angular**، توفّر مكوّنات وأنماطاً جاهزة تسرّع بناء الواجهات الكبيرة.

### الواجهة الخلفية (Back-end)

هي ما لا يراه المستخدم: الخوادم وقواعد البيانات والمنطق الذي يعالج الطلبات، وواجهات البرمجة (APIs) التي تربط الواجهة بالبيانات. يحتاج مطوّر الواجهة الخلفية إلى مهارة عالية في كتابة الكود، وفهم لقواعد البيانات، وإلمام بالحوسبة السحابية وأمن المعلومات وأنظمة التشغيل.

أدواته الشائعة:

- **لغات البرمجة:** مثل Python وJavaScript وPHP وJava وC# وGo.
- **Node.js:** ليست لغة، بل بيئة تشغيل (Runtime) تتيح كتابة الخوادم بلغة JavaScript.
- **SQL:** لغة استعلام للتعامل مع قواعد البيانات العلائقية مثل PostgreSQL وMySQL.
- **الأطر (Frameworks):** لكل لغة أطرها التي توفّر طريقة قياسية لبناء التطبيق، مثل **Express** (لـ Node.js) و**Django** (لـ Python) و**Laravel** (لـ PHP) و**Spring** (لـ Java).

ومن يجمع المجالين يُسمّى **مطوّر Full-stack**. ومن المفيد لكل طرف أن يفهم أساسيات الطرف الآخر حتى يعمل الفريق بانسجام.

## لماذا عليه طلب كبير؟

انتهى زمن الاعتماد على الملصقات الورقية وحدها. كل شركة اليوم، كبيرة كانت أو ناشئة، تحتاج موقعاً يعرض خدماتها ويجذب الزبائن ويتيح لهم التفاعل معها في أي وقت ومن أي مكان، ويخدم التسويق الرقمي. ومع انتقال الخدمات والمتاجر إلى الإنترنت، يزداد الطلب على من يبني هذه المواقع ويطوّرها، داخل العراق وفي العمل عن بعد.

## هل أحتاج شهادة جامعية؟

لا. هذا من أجمل ما في المجال: يمكنك تعلّمه ذاتياً والحصول على عمل بمشاريع تثبت مهارتك. ما يهمّ أصحاب العمل غالباً هو ما تستطيع بناءه. ابنِ مشاريع حقيقية، وارفعها على GitHub، واجمعها في معرض أعمال (Portfolio). وإن لم تكن قد أنشأت حساباً على GitHub بعد، فابدأ من [خطواتك الأولى على الإنترنت](/club/first-steps-online).

## خطة مقترحة للبداية

1. تعلّم HTML وCSS وابنِ صفحات بسيطة.
2. تعلّم JavaScript جيداً قبل القفز إلى أي إطار.
3. تعلّم Git وGitHub لإدارة مشاريعك.
4. اختر إطار واجهة أمامية واحداً (React مثلاً) وابنِ به مشروعين.
5. انتقل إلى الواجهة الخلفية: لغة واحدة وإطارها، وقاعدة بيانات وSQL.
6. انشر مشاريعك على الإنترنت، واستعن بخدمات [الحوسبة السحابية](/club/cloud-computing).

وإن أردت الانتقال لاحقاً إلى العمل الحر، فاقرأ دليل [العمل عن بعد](/club/remote-work-and-freelancing).

## مستودعات GitHub تستحق المتابعة

- [developer-roadmap](https://github.com/kamranahmedse/developer-roadmap): خرائط طريق لكل تخصص.
- [30-seconds-of-code](https://github.com/Chalarangelo/30-seconds-of-code): مقتطفات كود قصيرة ومفيدة.
- [awesome-cheatsheets](https://github.com/LeCoupa/awesome-cheatsheets): ملخّصات سريعة للغات والأدوات.
- [web-development-resources](https://github.com/markodenic/web-development-resources): مصادر مجمّعة لتطوير الويب.
- [css-protips](https://github.com/AllThingsSmitty/css-protips): نصائح عملية في CSS.
- [awesome-design-patterns](https://github.com/DovAmir/awesome-design-patterns): أنماط التصميم البرمجي.
- [coding-interview-university](https://github.com/jwasham/coding-interview-university): خطة دراسة لمقابلات البرمجة.
- [awesome-interview-questions](https://github.com/DopplerHQ/awesome-interview-questions): أسئلة مقابلات مصنّفة.
- [free-programming-books](https://github.com/EbookFoundation/free-programming-books): كتب برمجة مجانية بلغات عديدة منها العربية.
- [the-art-of-command-line](https://github.com/jlevy/the-art-of-command-line): إتقان سطر الأوامر.
- [awesome](https://github.com/sindresorhus/awesome): فهرس لقوائم "awesome" في كل المواضيع.
- [freeCodeCamp](https://github.com/freeCodeCamp/freeCodeCamp): منهج freeCodeCamp المفتوح.
- [frontend-dev-bookmarks](https://github.com/dypsilon/frontend-dev-bookmarks): مصادر الواجهة الأمامية.
- [tech-interview-handbook](https://github.com/yangshun/tech-interview-handbook): دليل التحضير للمقابلات التقنية.

## مصادر للتعلّم

- [The Odin Project](https://www.theodinproject.com): منهج مجاني كامل لتطوير الويب.
- [freeCodeCamp](https://www.freecodecamp.org): دروس وشهادات مجانية.
- [MDN Web Docs](https://developer.mozilla.org): المرجع الأهم لـ HTML وCSS وJavaScript.
- [roadmap.sh](https://roadmap.sh): خرائط طريق تفاعلية لكل تخصص.

ولتسأل وتتعرّف على مطوّرين آخرين، انضم إلى [The IDEA Club](https://t.me/theideaclub).$ar$,
    $en$Web development is one of the most in-demand areas of programming, and one of the easiest to break into on your own. It covers building, designing and maintaining websites and web apps, from simple informational sites to fully interactive applications.

## The iceberg: front end and back end

Picture a website as an iceberg. The part above the water is the **front end**; the much larger part below the surface is the **back end**.

### Front end

The front end is everything users see and touch: the layout, colors, fonts, menus and buttons, and how content adapts to different screens. A front-end developer needs:

- A good grasp of design basics and tools like Figma, to turn designs into real pages.
- The habit of writing clear, well-organized, maintainable code.
- Care for user experience, accessibility and performance.

The core tools:

- **HTML:** a markup language that defines a page's structure and content.
- **CSS:** a style language that controls appearance, color and layout.
- **JavaScript:** the programming language that makes pages interactive and generates dynamic content.

Strictly speaking, HTML and CSS aren't programming languages but markup and styling languages; still, nothing on the web works without them. On top of JavaScript sit **libraries and frameworks** such as **React**, **Vue.js** and **Angular**, which provide ready-made components and patterns for building large interfaces faster.

### Back end

The back end is what users never see: servers, databases, the logic that handles requests, and the APIs that connect the interface to data. Back-end developers need strong coding skills, an understanding of databases, and familiarity with cloud computing, security and operating systems.

Common tools:

- **Programming languages:** Python, JavaScript, PHP, Java, C# and Go, among others.
- **Node.js:** not a language but a runtime that lets you write servers in JavaScript.
- **SQL:** a query language for relational databases such as PostgreSQL and MySQL.
- **Frameworks:** each language has frameworks that give you a standard way to build an app, such as **Express** (Node.js), **Django** (Python), **Laravel** (PHP) and **Spring** (Java).

Someone who works across both is a **full-stack developer**. Either way, it helps to understand the basics of the other side so the team works smoothly together.

## Why it's in demand

Paper posters and old-style ads are no longer enough. Every business, large or new, needs a website that presents its services, attracts customers, lets them engage at any time from anywhere, and supports its digital marketing. As shops and services move online, demand keeps growing for people who build and maintain these sites, both in Iraq and in remote roles.

## Do I need a degree?

No, and that's one of the best things about the field. You can teach yourself and get hired on the strength of what you've built. Employers usually care most about what you can make. Build real projects, push them to GitHub and collect them in a portfolio. If you don't have a GitHub profile yet, start with [your first steps online](/club/first-steps-online).

## A suggested path

1. Learn HTML and CSS and build simple pages.
2. Learn JavaScript properly before jumping into a framework.
3. Learn Git and GitHub to manage your projects.
4. Pick one front-end framework (React, for example) and build two projects with it.
5. Move to the back end: one language and its framework, plus a database and SQL.
6. Deploy your projects online, using [cloud services](/club/cloud-computing).

When you're ready to take on client work, read our guide to [remote work and freelancing](/club/remote-work-and-freelancing).

## GitHub repositories worth following

- [developer-roadmap](https://github.com/kamranahmedse/developer-roadmap): roadmaps for every specialty.
- [30-seconds-of-code](https://github.com/Chalarangelo/30-seconds-of-code): short, useful code snippets.
- [awesome-cheatsheets](https://github.com/LeCoupa/awesome-cheatsheets): quick references for languages and tools.
- [web-development-resources](https://github.com/markodenic/web-development-resources): a collection of web development resources.
- [css-protips](https://github.com/AllThingsSmitty/css-protips): practical CSS tips.
- [awesome-design-patterns](https://github.com/DovAmir/awesome-design-patterns): software design patterns.
- [coding-interview-university](https://github.com/jwasham/coding-interview-university): a study plan for coding interviews.
- [awesome-interview-questions](https://github.com/DopplerHQ/awesome-interview-questions): interview questions by topic.
- [free-programming-books](https://github.com/EbookFoundation/free-programming-books): free programming books in many languages, Arabic included.
- [the-art-of-command-line](https://github.com/jlevy/the-art-of-command-line): mastering the command line.
- [awesome](https://github.com/sindresorhus/awesome): an index of "awesome" lists on every topic.
- [freeCodeCamp](https://github.com/freeCodeCamp/freeCodeCamp): freeCodeCamp's open curriculum.
- [frontend-dev-bookmarks](https://github.com/dypsilon/frontend-dev-bookmarks): front-end resources.
- [tech-interview-handbook](https://github.com/yangshun/tech-interview-handbook): preparing for technical interviews.

## Where to learn

- [The Odin Project](https://www.theodinproject.com): a complete, free web development curriculum.
- [freeCodeCamp](https://www.freecodecamp.org): free lessons and certifications.
- [MDN Web Docs](https://developer.mozilla.org): the go-to reference for HTML, CSS and JavaScript.
- [roadmap.sh](https://roadmap.sh): interactive roadmaps for every specialty.

To ask questions and meet other developers, join [The IDEA Club](https://t.me/theideaclub).$en$,
    now() - interval '28 minutes'
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
