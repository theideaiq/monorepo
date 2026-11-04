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
  bulbs: "رصيدي من الگلوبات",
  bulbsOpen: "افتح الگلوبات",
  bulbsPending: "و{pending} بالطريق (تصير جاهزة بعد ما تخلص فترة الإرجاع).",
  bulbsText: "عندك {available} گلوب (تسوه {worth}) جاهزة تستعملها وقت الدفع.",
  connect: "اربطه من بطاقتك",
  faq: "الأسئلة الشائعة",
  faqEmpty: "ماكو أسئلة شائعة بعد.",
  faqPickQuestion: "اختار سؤال:",
  faqPickTopic: "اختار موضوع:",
  faqTopic_business: "Partners",
  faqTopic_club: "Club",
  faqTopic_general: "عام",
  faqTopic_plus: "Plus",
  faqTopic_store: "السوگ",
  inlineOpen: "افتح في السوگ",
  joinNeedsPlus:
    "{chat} لأعضاء الپلص. اشترك بالپلص وبعدين اطلب تنضم مرة ثانية.",
  joinNotLinked:
    "حتى تنضم لـ{chat}، اربط Telegram ببطاقة پاسك أول شي (بطاقتك ← الإعدادات ← Telegram)، وبعدين اطلب تنضم مرة ثانية.",
  linkApp: "تطبيق ايديا",
  linkClub: "النادي على تيليجرام",
  links: "روابط",
  linksTitle: "روابط ايديا:",
  linkWebsite: "الموقع",
  menuGreeting:
    "هلو {name}! آني الدرويد من ايديا. شلون أگدر أساعدك؟",
  newPost: "اكو منشور جديد بـ{channel}:",
  newPostOpen: "افتح المنشور",
  newsletterNowOff: "وگّفت النشرة. ما راح ندزلك منشوراتنا الجديدة.",
  newsletterNowOn: "شغّلت النشرة. راح ندزلك منشوراتنا الجديدة.",
  newsletterOff: "النشرة: موگوفة",
  newsletterOn: "النشرة: شغّالة ✓",
  notificationOpen: "افتح",
  notLinked:
    "اربط Telegram ببطاقة پاسك حتى تشوف طلباتك ورصيدك هنا. افتح بطاقتك ← الإعدادات ← Telegram.",
  orderLine: "#{number} · {status} · {total}",
  orderStatus_cancelled: "ملغى",
  orderStatus_confirmed: "مؤكد",
  orderStatus_delivered: "توصّل",
  orderStatus_paid: "مدفوع",
  orderStatus_pending: "ينتظر الدفع",
  orderStatus_processing: "دا نجهّزه",
  orderStatus_refunded: "رجعنالك فلوسه",
  orderStatus_shipped: "بالطريق",
  orders: "تتبّع طلبي",
  ordersEmpty: "ماكو طلبات بعد.",
  ordersOpen: "كل طلباتي",
  ordersTitle: "آخر طلباتك:",
  outOfStock: "مو متوفر هسه",
  plus: "Plus",
  plusOpen: "اشترك في الپلص",
  plusText:
    "الپلص اشتراك شهري تستأجر بيه ألعاب وكتب وأفلام، نوصلها لبابك ونرجع ناخذها منك. كل خطة تحدد كم غرض تگدر يكون عندك بنفس الوقت.",
  postArrivals: "وصل جديد لسوگ ايديا",
  postArrivalsMore: "و{count} غيرها",
  postArrivalsOpen: "تسوّق الجديد",
  postEventOpen: "التفاصيل والحجز",
  postNewsOpen: "اقرأ أكثر",
  postProductOpen: "شوف المنتج",
  priceFrom: "يبدي من {price}",
  rental: "للإيجار مع الپلص",
  search: "دوّر بالسوگ",
  searchEmpty: "ما لگيت منتجات تطابق «{query}».",
  searchPrompt: "اكتب اسم المنتج اللي تدوّر عليه:",
  searchResults: "هذي نتائج «{query}»:",
  searchUsage: "اكتب /search وبعدها اسم المنتج، مثلًا: /search بلايستيشن",
  shop: "🛍️ تسوّق في السوگ",
  stock: "متوفر: {count}",
  support: "احچي ويانا",
  supportPrompt: "اكتب رسالتك لفريق الدعم وراح نرد عليك بأقرب وقت:",
  supportSent:
    "وصلتنا رسالتك. رقم طلب الدعم #{number}، وراح تلگى الرد بصفحة المساعدة.",
  supportSentTelegram: "وصلت رسالتك لفريق الدعم وراح نرد عليك هنا قريب.",
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
  faqTopic_business: "Partners",
  faqTopic_club: "Club",
  faqTopic_general: "General",
  faqTopic_plus: "Plus",
  faqTopic_store: "Store",
  inlineOpen: "Open in the store",
  joinNeedsPlus:
    "{chat} is for Plus members. Join Plus, then ask to join again.",
  joinNotLinked:
    "To join {chat}, connect Telegram to your Pass first (Your Pass → Settings → Telegram), then ask to join again.",
  linkApp: "The IDEA app",
  linkClub: "The Club on Telegram",
  links: "Links",
  linksTitle: "The IDEA links:",
  linkWebsite: "Website",
  menuGreeting: "Hi {name}! I'm Droid, your assistant. How can I help?",
  newPost: "New post in {channel}:",
  newPostOpen: "Open the post",
  newsletterNowOff: "Newsletter turned off. We won't send you new posts.",
  newsletterNowOn: "Newsletter turned on. We'll send you our new posts.",
  newsletterOff: "Newsletter: off",
  newsletterOn: "Newsletter: on ✓",
  notificationOpen: "Open",
  notLinked:
    "Connect Telegram to your Pass to see your orders and Bulbs here: Your Pass → Settings → Telegram.",
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
  plus: "Plus",
  plusOpen: "Join Plus",
  plusText:
    "Plus is a monthly plan to rent games, books and movies, delivered to you and picked up when you're done. Each plan sets how many items you can have at once.",
  postArrivals: "New in The IDEA store",
  postArrivalsMore: "and {count} more",
  postArrivalsOpen: "Shop what's new",
  postEventOpen: "Details and RSVP",
  postNewsOpen: "Read more",
  postProductOpen: "See the product",
  priceFrom: "From {price}",
  rental: "Rent with Plus",
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
