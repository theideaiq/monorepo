-- The IDEA Post: From a Telegram channel to The IDEA Post (Stories)
do $do$
declare
  post_id uuid;
begin
  insert into public.posts (slug, section, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, published_at)
  values (
    'our-story-so-far',
    'stories',
    $ar$من قناة على تيليجرام إلى The IDEA Post$ar$,
    $en$From a Telegram channel to The IDEA Post$en$,
    $ar$كيف بدأت The IDEA Post وThe IDEA Club، وما الذي تعلّمناه من آلاف الطلبة الذين سألونا عن طريقهم.$ar$,
    $en$How The IDEA Post and The IDEA Club began, and what we learned from the thousands of students who asked us for directions.$en$,
    $ar$بدأت القصة بسؤال كان يتكرّر علينا كل يوم: «من أين أبدأ؟». طلبة في الإعدادية يريدون الدراسة في الخارج ولا يعرفون ما هو SAT، وخرّيجون يسمعون عن برامج التبادل ولا يجدون من يشرح لهم كيف يقدّمون، وشباب يتعلّمون البرمجة أو التصميم وحدهم من دون خريطة.

فأنشأنا قناة على تيليجرام نجمع فيها ما نعرفه: أدلّة عن المنح والقبولات، وشروحات لاختبارات اللغة، ومقالات عن المهارات التي يطلبها سوق العمل، مكتوبة بلغة قريبة من الطلبة ومن تجربتنا نحن.

## مجتمع قبل أن يكون قناة

سرعان ما صار القرّاء يكتبون لنا أكثر مما نكتب لهم: يسألون، ويصحّحون، ويشاركون الفرص التي يجدونها. وصلت القناة إلى ألف مشترك، ثم أطلقنا **The IDEA Club**، مجموعة نقاش على تيليجرام تجاوز أعضاؤها الألف وتبادلوا فيها أكثر من مليون رسالة في أقل من سنتين، من أسئلة القبول إلى نوادي الاهتمامات مثل نادي الفن.

## خارج الشاشة

حضرنا أيضاً حيث يلتقي الشباب في بغداد: كانت The IDEA Post راعيةً لمهرجان اللغة الإنجليزية في منظمة بوابة المعرفة، وقدّمنا فيه أولى جلساتنا الحضورية «Opportunities at Your Fingertips» عن الفرص والتبادل الثقافي، وكان لنا جناح في مهرجان بغداد للطائرات الورقية في شارع أبي نواس نعرّف فيه بالبرامج والمنح المتاحة.

## ماذا تعلّمنا

- **المعلومة الصحيحة في وقتها تغيّر مسار شخص.** كثيرون قدّموا على برنامج أو منحة لأنهم قرأوا عنها في الوقت المناسب.
- **المواعيد والشروط تتغيّر بسرعة.** لذلك نربط دائماً بالمصادر الرسمية ونحدّث الأدلّة.
- **لا أحد ينجح وحده.** الأسئلة التي يطرحها عضو واحد تفيد مئات غيره.

## إلى أين الآن

أصبحت The IDEA Post اليوم جزءاً من The IDEA على موقعنا: الأخبار والقصص وأعمال الأعضاء وقسم **تعلّم** الذي جمعنا فيه الأدلّة القديمة بعد تحديثها. يمكنك أن تبدأ من [صفحة الأدلّة](/club/the-post-guides)، وأن تنضم إلى [The IDEA Club](https://t.me/theideaiq_club) لتسأل وتشارك، وأن [ترسل لنا](/club#yours) مقالتك أو قصيدتك أو عملك الفني لننشره في أعمال الأعضاء.

شكراً لكل من قرأ وسأل وشارك. الرحلة ما زالت في بدايتها.$ar$,
    $en$It started with a question we heard every day: "Where do I start?" Secondary-school students who wanted to study abroad but didn't know what the SAT was, graduates who heard about exchange programs but had no one to explain how to apply, and young people teaching themselves programming or design without a map.

So we opened a Telegram channel and wrote down what we knew: guides to scholarships and admissions, explanations of English tests, and articles on the skills employers ask for, written in plain language and from our own experience.

## A community before a channel

Readers soon wrote to us more than we wrote to them: asking, correcting, and sharing the opportunities they found. The channel passed a thousand subscribers, and then we launched **The IDEA Club**, a discussion group on Telegram that grew past a thousand members who exchanged more than a million messages in under two years, from admissions questions to interest clubs such as the Art Club.

## Off the screen

We also showed up where young people meet in Baghdad. The IDEA Post sponsored the English Language Festival at the Knowledge Gate organization, where we gave our first in-person session, "Opportunities at Your Fingertips", on opportunities and cultural exchange, and we ran a booth at the Baghdad Kites Carnival on Abu Nuwas Street to share programs and scholarships.

## What we learned

- **The right information at the right time changes someone's path.** Many people applied to a program or scholarship because they read about it in time.
- **Deadlines and requirements change quickly.** That's why we always link to the official sources and keep our guides updated.
- **Nobody makes it alone.** A question one member asks helps hundreds of others.

## Where we are now

The IDEA Post is now part of The IDEA on our website: news, stories, members' work, and a **Learn** section where we gathered the old guides, brought up to date. Start with [the guides](/club/the-post-guides), join [The IDEA Club](https://t.me/theideaiq_club) to ask and share, and [send us](/club#yours) your essay, poem or artwork to be considered for Members' work.

Thank you to everyone who read, asked and shared. The journey is only beginning.$en$,
    now() - interval '2 minutes'
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
