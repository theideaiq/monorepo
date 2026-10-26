/**
 * Droid's own Arabic and English strings. The bot speaks Arabic unless the
 * person's Telegram app is set to English.
 */

export type BotLocale = "ar" | "en";

/** Arabic for everyone except people whose Telegram language is English. */
export const localeOf = (languageCode: string | undefined): BotLocale =>
  languageCode?.toLowerCase().startsWith("en") ? "en" : "ar";

const ar = {
  back: "‹ رجوع",
  bulbs: "رصيدي من Bulbs",
  bulbsOpen: "افتح Bulbs",
  bulbsPending: "و{pending} في الطريق (تصبح متاحة بعد فترة الإرجاع).",
  bulbsText:
    "لديك {available} Bulbs (بقيمة {worth}) جاهزة للاستخدام عند الدفع.",
  connect: "اربطه من بطاقتك",
  faq: "الأسئلة الشائعة",
  faqEmpty: "لا توجد أسئلة شائعة بعد.",
  faqPickQuestion: "اختر سؤالاً:",
  faqPickTopic: "اختر موضوعاً:",
  faqTopic_business: "The IDEA Business",
  faqTopic_club: "The IDEA Club",
  faqTopic_general: "عام",
  faqTopic_plus: "The IDEA Plus",
  faqTopic_store: "المتجر",
  inlineOpen: "افتح في المتجر",
  joinNeedsPlus:
    "{chat} لأعضاء The IDEA Plus. اشترك في Plus ثم اطلب الانضمام مرة أخرى.",
  joinNotLinked:
    "للانضمام إلى {chat}، اربط Telegram بـ The IDEA Pass أولاً (بطاقتك ← الإعدادات ← Telegram)، ثم اطلب الانضمام مرة أخرى.",
  linkApp: "تطبيق The IDEA",
  linkClub: "The IDEA Club على تيليجرام",
  links: "روابط",
  linksTitle: "روابط The IDEA:",
  linkWebsite: "الموقع",
  menuGreeting:
    "أهلاً {name}! أنا The IDEA Droid، مساعدك من The IDEA. كيف يمكنني مساعدتك؟",
  newPost: "منشور جديد في {channel}:",
  newPostOpen: "افتح المنشور",
  newsletterNowOff: "أوقفت النشرة الإخبارية. لن نرسل لك منشوراتنا الجديدة.",
  newsletterNowOn: "فعّلت النشرة الإخبارية. سنرسل لك منشوراتنا الجديدة.",
  newsletterOff: "النشرة الإخبارية: متوقفة",
  newsletterOn: "النشرة الإخبارية: مفعّلة ✓",
  notificationOpen: "افتح",
  notLinked:
    "اربط Telegram بـ The IDEA Pass لترى طلباتك ورصيدك هنا. افتح بطاقتك ← الإعدادات ← Telegram.",
  orderLine: "#{number} · {status} · {total}",
  orderStatus_cancelled: "ملغى",
  orderStatus_confirmed: "مؤكد",
  orderStatus_delivered: "تم التسليم",
  orderStatus_paid: "مدفوع",
  orderStatus_pending: "بانتظار الدفع",
  orderStatus_processing: "قيد التجهيز",
  orderStatus_refunded: "مسترد",
  orderStatus_shipped: "في الطريق",
  orders: "تتبّع طلبي",
  ordersEmpty: "لا توجد طلبات بعد.",
  ordersOpen: "كل طلباتي",
  ordersTitle: "آخر طلباتك:",
  outOfStock: "غير متوفر حالياً",
  plus: "The IDEA Plus",
  plusOpen: "اشترك في The IDEA Plus",
  plusText:
    "The IDEA Plus اشتراك شهري لاستئجار الألعاب والكتب والأفلام، نوصلها إليك ونستلمها منك. كل خطة تحدد عدد العناصر التي يمكنك استئجارها في الوقت نفسه.",
  postArrivals: "وصل حديثًا إلى متجر The IDEA",
  postArrivalsMore: "و{count} غيرها",
  postArrivalsOpen: "تسوّق الجديد",
  postEventOpen: "التفاصيل والحجز",
  postNewsOpen: "اقرأ المزيد",
  postProductOpen: "شاهد المنتج",
  priceFrom: "ابتداءً من {price}",
  rental: "للإيجار مع The IDEA Plus",
  search: "البحث في المتجر",
  searchEmpty: "لم أجد منتجات تطابق «{query}».",
  searchPrompt: "اكتب اسم المنتج الذي تبحث عنه:",
  searchResults: "نتائج البحث عن «{query}»:",
  searchUsage: "اكتب /search ثم اسم المنتج، مثلاً: /search بلايستيشن",
  shop: "🛍️ تسوّق في المتجر",
  stock: "متوفر: {count}",
  support: "تحدّث معنا",
  supportPrompt: "اكتب رسالتك لفريق الدعم وسنرد عليك في أقرب وقت:",
  supportSent:
    "وصلت رسالتك. رقم طلب الدعم #{number}، وستجد الرد في صفحة المساعدة.",
  supportSentTelegram: "وصلت رسالتك إلى فريق الدعم وسنرد عليك هنا قريباً.",
} as const;

export type MessageKey = keyof typeof ar;

const en: Record<MessageKey, string> = {
  back: "‹ Back",
  bulbs: "My Bulbs",
  bulbsOpen: "Open Bulbs",
  bulbsPending: "Plus {pending} on the way (usable after the return window).",
  bulbsText:
    "You have {available} Bulbs (worth {worth}) ready to spend at checkout.",
  connect: "Connect on Your Pass",
  faq: "FAQ",
  faqEmpty: "There are no FAQs yet.",
  faqPickQuestion: "Pick a question:",
  faqPickTopic: "Pick a topic:",
  faqTopic_business: "The IDEA Business",
  faqTopic_club: "The IDEA Club",
  faqTopic_general: "General",
  faqTopic_plus: "The IDEA Plus",
  faqTopic_store: "Store",
  inlineOpen: "Open in the store",
  joinNeedsPlus:
    "{chat} is for The IDEA Plus members. Join Plus, then ask to join again.",
  joinNotLinked:
    "To join {chat}, connect Telegram to The IDEA Pass first (Your Pass → Settings → Telegram), then ask to join again.",
  linkApp: "The IDEA app",
  linkClub: "The IDEA Club on Telegram",
  links: "Links",
  linksTitle: "The IDEA links:",
  linkWebsite: "Website",
  menuGreeting:
    "Hi {name}! I'm The IDEA Droid, your assistant. How can I help?",
  newPost: "New post in {channel}:",
  newPostOpen: "Open the post",
  newsletterNowOff: "Newsletter turned off. We won't send you new posts.",
  newsletterNowOn: "Newsletter turned on. We'll send you our new posts.",
  newsletterOff: "Newsletter: off",
  newsletterOn: "Newsletter: on ✓",
  notificationOpen: "Open",
  notLinked:
    "Connect Telegram to The IDEA Pass to see your orders and Bulbs here: Your Pass → Settings → Telegram.",
  orderLine: "#{number} · {status} · {total}",
  orderStatus_cancelled: "Cancelled",
  orderStatus_confirmed: "Confirmed",
  orderStatus_delivered: "Delivered",
  orderStatus_paid: "Paid",
  orderStatus_pending: "Awaiting payment",
  orderStatus_processing: "Being prepared",
  orderStatus_refunded: "Refunded",
  orderStatus_shipped: "On the way",
  orders: "Track my order",
  ordersEmpty: "No orders yet.",
  ordersOpen: "All my orders",
  ordersTitle: "Your latest orders:",
  outOfStock: "Out of stock",
  plus: "The IDEA Plus",
  plusOpen: "Join The IDEA Plus",
  plusText:
    "The IDEA Plus is a monthly membership to rent games, books and movies, delivered to you and picked up when you're done. Each plan sets how many items you can have at once.",
  postArrivals: "New in The IDEA store",
  postArrivalsMore: "and {count} more",
  postArrivalsOpen: "Shop what's new",
  postEventOpen: "Details and RSVP",
  postNewsOpen: "Read more",
  postProductOpen: "See the product",
  priceFrom: "From {price}",
  rental: "Rent with The IDEA Plus",
  search: "Search the store",
  searchEmpty: "No products match “{query}”.",
  searchPrompt: "Type the name of the product you're looking for:",
  searchResults: "Results for “{query}”:",
  searchUsage:
    "Send /search followed by a product name, e.g. /search PlayStation",
  shop: "🛍️ Shop the store",
  stock: "In stock: {count}",
  support: "Talk to us",
  supportPrompt: "Write your message to our support team and we'll reply soon:",
  supportSent:
    "Got it. Your support request is #{number}; you'll find the reply on Help.",
  supportSentTelegram:
    "Your message reached our support team; we'll reply here soon.",
};

const messages: Record<BotLocale, Record<MessageKey, string>> = { ar, en };

/** A bot string with `{param}` placeholders filled in. */
export const t = (
  locale: BotLocale,
  key: MessageKey,
  params: Record<string, number | string> = {}
) =>
  messages[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder
  );

export const botMessages = messages;
