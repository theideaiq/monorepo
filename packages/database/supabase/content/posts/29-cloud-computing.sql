-- The IDEA Post: Cloud computing explained (Learn)
do $do$
declare
  post_id uuid;
begin
  insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
  values (
    'cloud-computing',
    'learn',
    $ar$الحوسبة السحابية: دليل مبسّط للمبتدئين$ar$,
    $en$Cloud computing, explained for beginners$en$,
    $ar$ما هي الحوسبة السحابية، والفرق بين SaaS وIaaS وPaaS، وأنواع السحابة، وكيف تبدأ مسيرتك فيها بشهادات معترف بها.$ar$,
    $en$What cloud computing is, how SaaS, IaaS and PaaS differ, the types of cloud, and how to start a career with recognized certifications.$en$,
    $ar$الحوسبة السحابية (Cloud Computing) من أهم تخصصات تقنية المعلومات اليوم. تختلف صياغة تعريفها بين Microsoft وAmazon وGoogle وIBM، لكنها تتفق على جوهر واحد: **تقديم موارد الحوسبة وخدماتها عبر الإنترنت**.

هذه الموارد تشمل الخوادم (Servers) والمساحات التخزينية وقواعد البيانات والشبكات والبرمجيات، وحتى قدرة المعالجة نفسها. بدل أن تشتري الأجهزة وتديرها بنفسك، تستأجرها من مزوّد وتتحكّم بها عبر الإنترنت.

## مبدآن أساسيان

- **عند الطلب (On-demand):** تطلب المورد فيصلك خلال دقائق، وتلغيه متى انتهت حاجتك إليه.
- **ادفع بقدر ما تستخدم (Pay-as-you-go):** تدفع مقابل استهلاكك الفعلي فقط، كفاتورة الكهرباء.

أشهر المزوّدين: **Amazon Web Services (AWS)** و**Microsoft Azure** و**Google Cloud**.

## نماذج الخدمة الثلاثة

### البرمجيات كخدمة (SaaS)

الأقرب إلى المستخدم العادي: تطبيق جاهز تستخدمه عبر المتصفح أو التطبيق دون تثبيت أو صيانة، والمزوّد مسؤول عن كل شيء خلفه. أمثلة: Gmail وMicrosoft 365 وNetflix وGoogle Docs.

### البنية التحتية كخدمة (IaaS)

يوفّر المزوّد الأجهزة الافتراضية والتخزين والشبكات، وأنت تدير نظام التشغيل والبرمجيات فوقها. يوفّر على الشركات شراء الخوادم وصيانتها، ويتيح زيادة القدرة أو تقليلها حسب الحاجة. أمثلة: **Amazon EC2** و**Google Compute Engine** و**Azure Virtual Machines**.

### المنصة كخدمة (PaaS)

يدير المزوّد البنية التحتية ونظام التشغيل وبيئة التشغيل، وأنت تركّز على كتابة تطبيقك ونشره فقط. مناسبة جداً للشركات الناشئة والمشاريع الصغيرة. أمثلة: **Google App Engine** و**Heroku** و**Red Hat OpenShift** و**Azure App Service**.

تُسمّى هذه الطبقات معاً **Cloud Computing Stack**، لأن كل طبقة تُبنى على التي تحتها.

## أنواع السحابة

- **السحابة العامة (Public Cloud):** موارد يشاركها عملاء كثيرون لدى مزوّد واحد، ومتاحة لأي شخص عبر الإنترنت.
- **السحابة الخاصة (Private Cloud):** موارد مخصّصة لمؤسسة واحدة، في مركز بياناتها أو لدى مزوّد.
- **السحابة الهجينة (Hybrid Cloud):** تجمع بين الاثنتين وتربطهما، فتبقى البيانات الحساسة في الخاصة وتستفيد المؤسسة من مرونة العامة.

## لماذا تتعلّمها؟

تكاد كل شركة تقنية اليوم تعتمد على السحابة، ومعظم المواقع والتطبيقات التي تستخدمها تعمل عليها. لذلك يكثر الطلب على مهندسي السحابة ومديري الأنظمة ومهندسي DevOps، وكثير من هذه الوظائف متاح عن بعد. وحتى لو كنت مطوّراً أو [عالم بيانات](/club/data-science)، ستحتاج أساسيات السحابة لنشر مشاريعك.

## كيف تبدأ؟

1. **تعلّم الأساسيات:** الشبكات، ونظام Linux، وسطر الأوامر.
2. **جرّب مجاناً:** تقدّم AWS وAzure وGoogle Cloud طبقات مجانية (Free Tier) أو أرصدة تجريبية للمبتدئين. انتبه لحدودها وراقب استهلاكك حتى لا تُفاجأ بفاتورة.
3. **احصل على شهادة تأسيسية:** مثل **AWS Certified Cloud Practitioner** أو **Microsoft Azure Fundamentals (AZ-900)** أو **Google Cloud Digital Leader**. هذه الشهادات تثبت فهمك الأساسي وتُضاف بقوّة إلى سيرتك الذاتية.
4. **ابنِ مشاريع:** انشر موقعاً، وأعدّ قاعدة بيانات، وجرّب الخدمات المُدارة. إن كنت جديداً على بناء المواقع فابدأ بـ [تطوير المواقع](/club/web-development).
5. **تخصّص:** بعد التأسيس، اختر مساراً مثل هندسة الحلول أو DevOps أو أمن السحابة، وتقدّم لشهاداته المتقدّمة.

## مصادر للتعلّم

- [AWS Skill Builder](https://skillbuilder.aws): دورات AWS الرسمية، كثير منها مجاني.
- [Microsoft Learn](https://learn.microsoft.com/training/azure/): مسارات Azure الرسمية ومنها التحضير لـ AZ-900.
- [Google Cloud Skills Boost](https://www.cloudskillsboost.google): مختبرات ودورات Google Cloud.
- [Google Cloud](https://cloud.google.com) و[AWS](https://aws.amazon.com) و[Azure](https://azure.microsoft.com): المواقع الرسمية وتفاصيل الطبقات المجانية.

ولتتعرّف على من يعملون في المجال، انضم إلى [The IDEA Club](https://t.me/theideaiq_club).$ar$,
    $en$Cloud computing is one of the most important areas of IT today. Microsoft, Amazon, Google and IBM each word the definition differently, but they agree on the core idea: **delivering computing resources and services over the internet**.

Those resources include servers, storage, databases, networking, software and raw processing power. Instead of buying and running hardware yourself, you rent it from a provider and manage it online.

## Two core ideas

- **On-demand:** you request a resource and get it within minutes, then release it when you no longer need it.
- **Pay-as-you-go:** you pay only for what you actually use, like an electricity bill.

The best-known providers are **Amazon Web Services (AWS)**, **Microsoft Azure** and **Google Cloud**.

## The three service models

### Software as a Service (SaaS)

The closest to everyday users: a ready-made application you use in a browser or app, with nothing to install or maintain; the provider runs everything behind it. Examples: Gmail, Microsoft 365, Netflix and Google Docs.

### Infrastructure as a Service (IaaS)

The provider supplies virtual machines, storage and networking; you manage the operating system and software on top. Companies avoid buying and maintaining servers and can scale capacity up or down as needed. Examples: **Amazon EC2**, **Google Compute Engine** and **Azure Virtual Machines**.

### Platform as a Service (PaaS)

The provider manages the infrastructure, operating system and runtime; you focus on writing and deploying your application. It suits startups and small projects especially well. Examples: **Google App Engine**, **Heroku**, **Red Hat OpenShift** and **Azure App Service**.

Together these layers are often called the **cloud computing stack**, because each builds on the one beneath it.

## Types of cloud

- **Public cloud:** resources shared by many customers of one provider, available to anyone over the internet.
- **Private cloud:** resources dedicated to a single organization, in its own data center or hosted by a provider.
- **Hybrid cloud:** a mix of both, connected together, so sensitive data stays private while the organization benefits from the public cloud's flexibility.

## Why learn it?

Nearly every tech company runs on the cloud, and so do most of the sites and apps you use. That keeps demand high for cloud engineers, systems administrators and DevOps engineers, and many of these roles are remote. Even as a developer or [data scientist](/club/data-science), you'll need cloud basics to deploy your work.

## How to start

1. **Learn the foundations:** networking, Linux and the command line.
2. **Experiment for free:** AWS, Azure and Google Cloud all offer free tiers or trial credits for beginners. Learn the limits and watch your usage so a bill doesn't surprise you.
3. **Earn a foundational certification:** such as **AWS Certified Cloud Practitioner**, **Microsoft Azure Fundamentals (AZ-900)** or **Google Cloud Digital Leader**. They prove your grasp of the basics and stand out on a CV.
4. **Build projects:** deploy a website, set up a database and try managed services. If you're new to building sites, start with [web development](/club/web-development).
5. **Specialize:** once you have the foundations, choose a path such as solutions architecture, DevOps or cloud security, and work toward its advanced certifications.

## Where to learn

- [AWS Skill Builder](https://skillbuilder.aws): official AWS training, much of it free.
- [Microsoft Learn](https://learn.microsoft.com/training/azure/): official Azure paths, including AZ-900 preparation.
- [Google Cloud Skills Boost](https://www.cloudskillsboost.google): Google Cloud labs and courses.
- [Google Cloud](https://cloud.google.com), [AWS](https://aws.amazon.com) and [Azure](https://azure.microsoft.com): the official sites, with free tier details.

To meet people working in the field, join [The IDEA Club](https://t.me/theideaiq_club).$en$,
    now() - interval '29 minutes'
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
