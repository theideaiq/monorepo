-- The IDEA Post: The Internet of Things (IoT), explained (Learn)
do $do$
declare
  post_id uuid;
begin
  insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
  values (
    'internet-of-things',
    'learn',
    $ar$إنترنت الأشياء (IoT): كيف تتحدّث الأجهزة مع بعضها؟$ar$,
    $en$The Internet of Things (IoT): how devices talk to each other$en$,
    $ar$ما هو إنترنت الأشياء، وأمثلة من حياتنا اليومية، والوظائف التي يوفّرها، ودورات تبدأ بها في هذا المجال.$ar$,
    $en$What the Internet of Things is, everyday examples, the jobs it creates, and courses to get you started.$en$,
    $ar$ربما سمعت بمصطلح **إنترنت الأشياء (Internet of Things)**، أو اختصاراً **IoT**. صار من تخصصات المستقبل المهمة، ومن الوظائف المطلوبة في السوق، لأنه مجال واسع يتقاطع مع البرمجة والإلكترونيات والشبكات والحوسبة السحابية وعلم البيانات.

## ما هو إنترنت الأشياء؟

هو شبكة من الأجهزة المتصلة بالإنترنت، تجمع البيانات من حولها عبر الحسّاسات، وتتبادلها مع أجهزة وأنظمة أخرى، وتتصرّف بناءً عليها.

في الحوسبة المعتادة يعطي الإنسان الأمر والجهاز ينفّذ. أما في IoT فالأجهزة تراقب وتتواصل مع بعضها وتحلّل البيانات وتتخذ قرارات وفق قواعد برمجها الإنسان مسبقاً، فيكتفي هو بالاستفادة من النتيجة.

و"الأشياء" هنا لا تقتصر على الأجهزة الذكية: قد تكون مصباحاً في بيتك، أو حسّاساً في مزرعة، أو جهاز تتبّع يحمله طفل، أو جهازاً يقيس نبض مريض.

## أمثلة من الحياة اليومية

- **البيت الذكي:** إضاءة ومكيّفات وأقفال تتحكّم بها من هاتفك، أو تعمل تلقائياً حسب الوقت ووجودك في البيت.
- **الثلاجة الذكية:** تعرض ما بداخلها وأنت خارج البيت، وتنبّهك حين يقترب تاريخ انتهاء صلاحية طعام سجّلته، ويمكن نظرياً ربطها بمتجر يطلب لك ما ينقص.
- **الصحة:** ساعات وأجهزة تقيس النبض والنوم وترسل البيانات للطبيب.
- **الزراعة:** حسّاسات تقيس رطوبة التربة وتشغّل الريّ عند الحاجة فقط، فتوفّر الماء.
- **المدن والصناعة:** إشارات مرور تتكيّف مع الزحام، وآلات في المصانع تنبّه قبل أن تتعطّل (الصيانة التنبّؤية).

النتيجة: حياة أسهل، ووقت ومال وموارد أقل هدراً.

## لا تنسَ الأمان والخصوصية

كل جهاز متصل باب محتمل للاختراق. كلمات المرور الافتراضية، والبرمجيات غير المحدّثة، وجمع البيانات الشخصية دون حماية، كلها مخاطر حقيقية. لذلك صار أمن إنترنت الأشياء تخصصاً قائماً بحد ذاته.

## الوظائف التي يوفّرها المجال

- **مطوّر IoT (IoT Developer):** يبرمج الأجهزة والتطبيقات التي تتحكّم بها.
- **مهندس أنظمة مدمجة (Embedded Systems Engineer):** يعمل على البرمجيات القريبة من العتاد والحسّاسات.
- **مهندس سحابة IoT (IoT Cloud Engineer):** يبني المنصات التي تستقبل بيانات الأجهزة وتعالجها.
- **مصمّم حلول IoT (IoT Architect):** يصمّم النظام كاملاً من الجهاز إلى السحابة.
- **مدير منتجات IoT (IoT Product Manager):** يحوّل الحاجة إلى منتج ويقود الفريق.

## كيف تبدأ؟

1. تعلّم أساسيات البرمجة، خصوصاً **Python** و**C/C++**.
2. اشترِ لوحة تطوير بسيطة مثل **Arduino** أو **Raspberry Pi** أو **ESP32**، وابدأ بمشاريع صغيرة: مصباح تتحكّم به من الهاتف، أو محطة طقس.
3. تعلّم أساسيات الشبكات وبروتوكولات الاتصال مثل MQTT وHTTP.
4. تعرّف على منصات السحابة التي تستقبل بيانات الأجهزة، واقرأ دليل [الحوسبة السحابية](/club/cloud-computing).
5. حلّل البيانات التي تجمعها، وهنا يفيدك [علم البيانات](/club/data-science).

المجال مفتوح، وستجد شروحات كثيرة على YouTube لكل خطوة.

## مصادر للتعلّم

- [Introduction to the Internet of Things على edX](https://www.edx.org/learn/iot-internet-of-things)
- [دورات إنترنت الأشياء على Coursera](https://www.coursera.org/courses?query=internet%20of%20things)، ومنها دورات البرمجة على لوحات IoT.
- [دورات إنترنت الأشياء على Coursera](https://www.coursera.org/courses?query=internet%20of%20things)
- [منصة إدراك](https://www.edraak.org): دورات عربية مجانية، ابحث فيها عن إنترنت الأشياء.
- [Arduino Docs](https://docs.arduino.cc) و[Raspberry Pi Learn](https://www.raspberrypi.com/documentation/): مراجع رسمية ومشاريع للمبتدئين.

ولتشارك مشاريعك وتسأل، انضم إلى [The IDEA Club](https://t.me/theideaclub).$ar$,
    $en$You've probably heard of the **Internet of Things**, or **IoT**. It has become one of the important fields of the future and a sought-after skill, because it spans programming, electronics, networking, cloud computing and data science.

## What is the Internet of Things?

It's a network of internet-connected devices that gather data from their surroundings through sensors, share it with other devices and systems, and act on it.

In everyday computing, a person gives a command and the machine carries it out. In IoT, devices monitor, talk to each other, analyze data and make decisions according to rules people programmed in advance, and people simply benefit from the result.

The "things" aren't only smart gadgets: a light in your home, a sensor on a farm, a tracker a child carries or a monitor measuring a patient's pulse all count.

## Everyday examples

- **Smart homes:** lights, air conditioners and locks you control from your phone, or that respond automatically to the time and whether you're home.
- **Smart fridges:** show what's inside while you're out and warn you when food you logged is about to expire; in principle they could even reorder from a shop.
- **Health:** watches and devices that track heart rate and sleep and send the data to a doctor.
- **Farming:** soil moisture sensors that switch irrigation on only when needed, saving water.
- **Cities and industry:** traffic lights that adapt to congestion, and factory machines that warn before they break down (predictive maintenance).

The result: easier lives and less wasted time, money and resources.

## Don't forget security and privacy

Every connected device is a potential way in for attackers. Default passwords, outdated software and unprotected personal data are real risks, which is why IoT security has become a specialty of its own.

## Jobs in the field

- **IoT developer:** programs devices and the apps that control them.
- **Embedded systems engineer:** works on software close to the hardware and sensors.
- **IoT cloud engineer:** builds the platforms that receive and process device data.
- **IoT architect:** designs the whole system, from device to cloud.
- **IoT product manager:** turns a need into a product and leads the team.

## How to start

1. Learn programming basics, especially **Python** and **C/C++**.
2. Get a simple development board such as an **Arduino**, **Raspberry Pi** or **ESP32**, and start with small projects: a light you control from your phone, or a weather station.
3. Learn networking basics and protocols such as MQTT and HTTP.
4. Get to know the cloud platforms that receive device data, and read our guide to [cloud computing](/club/cloud-computing).
5. Analyze the data you collect; that's where [data science](/club/data-science) helps.

The field is open, and you'll find plenty of YouTube tutorials for every step.

## Where to learn

- [Introduction to the Internet of Things on edX](https://www.edx.org/learn/iot-internet-of-things)
- [Internet of Things courses on Coursera](https://www.coursera.org/courses?query=internet%20of%20things), including programming with IoT boards.
- [Internet of Things courses on Coursera](https://www.coursera.org/courses?query=internet%20of%20things)
- [Edraak](https://www.edraak.org): free Arabic courses; search for Internet of Things.
- [Arduino Docs](https://docs.arduino.cc) and [Raspberry Pi documentation](https://www.raspberrypi.com/documentation/): official references and beginner projects.

To share your projects and ask questions, join [The IDEA Club](https://t.me/theideaclub).$en$,
    now() - interval '31 minutes'
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
