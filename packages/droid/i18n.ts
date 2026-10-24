/**
 * Droid's own Arabic and English strings. The bot speaks Arabic unless the
 * person's Telegram app is set to English.
 */

export type BotLocale = "ar" | "en";

/** Arabic for everyone except people whose Telegram language is English. */
export const localeOf = (languageCode: string | undefined): BotLocale =>
  languageCode?.toLowerCase().startsWith("en") ? "en" : "ar";

const ar = {
  aiError:
    "عذراً، لم أتمكن من الرد الآن. جرّب مرة أخرى بعد قليل أو استخدم القائمة.",
  aiSystemLocale: "Reply in Arabic (Modern Standard Arabic, friendly).",
  back: "‹ رجوع",
  banDone: "تم حظر {name} من {count} مجموعة.",
  banNotAdmin: "هذا الأمر للمشرفين فقط.",
  banNotFound: "لم أجد هذا المستخدم. ردّ على إحدى رسائله واكتب /ban.",
  banProtected: "لا يمكن حظر مشرف.",
  banUsage: "اكتب /ban @username أو ردّ على رسالة الشخص واكتب /ban.",
  faq: "الأسئلة الشائعة",
  faqEmpty: "لا توجد أسئلة شائعة بعد.",
  faqPickQuestion: "اختر سؤالاً:",
  faqPickTopic: "اختر موضوعاً:",
  faqTopic_academy: "الأكاديمية",
  faqTopic_general: "عام",
  faqTopic_plus: "The IDEA Plus",
  faqTopic_store: "المتجر",
  faqTopic_suite: "The IDEA Suite",
  floodWarning:
    "{name}، أرسلت الرسالة نفسها عدة مرات. تم إيقافك عن الكتابة لخمس دقائق.",
  linkApp: "تطبيق The IDEA",
  linkClub: "The Club على تيليجرام",
  links: "روابط",
  linksTitle: "روابط The IDEA:",
  linkWebsite: "الموقع",
  menuGreeting: "أهلاً {name}! أنا Droid، مساعد The IDEA. كيف يمكنني مساعدتك؟",
  menuGreetingAi:
    "أهلاً {name}! أنا Droid، مساعد The IDEA. اختر من القائمة أو اكتب سؤالك مباشرة.",
  newPost: "منشور جديد في {channel}:",
  newPostOpen: "افتح المنشور",
  newsletterNowOff: "أوقفت النشرة الإخبارية. لن نرسل لك منشوراتنا الجديدة.",
  newsletterNowOn: "فعّلت النشرة الإخبارية. سنرسل لك منشوراتنا الجديدة.",
  newsletterOff: "النشرة الإخبارية: متوقفة",
  newsletterOn: "النشرة الإخبارية: مفعّلة ✓",
  outOfStock: "غير متوفر حالياً",
  plus: "The IDEA Plus",
  plusOpen: "اشترك في The IDEA Plus",
  plusText:
    "The IDEA Plus اشتراك شهري لاستئجار الألعاب والكتب والأفلام، نوصلها إليك ونستلمها منك. كل خطة تحدد عدد العناصر التي يمكنك استئجارها في الوقت نفسه.",
  rental: "للإيجار مع The IDEA Plus",
  search: "البحث في المتجر",
  searchEmpty: "لم أجد منتجات تطابق «{query}».",
  searchPrompt: "اكتب اسم المنتج الذي تبحث عنه:",
  searchResults: "نتائج البحث عن «{query}»:",
  searchUsage: "اكتب /search ثم اسم المنتج، مثلاً: /search بلايستيشن",
  stock: "متوفر: {count}",
  unban: "طلب رفع الحظر",
  unbanDuplicate: "لديك طلب رفع حظر قيد المراجعة. سيتواصل معك فريقنا قريباً.",
  unbanNotBanned: "حسابك غير محظور في مجموعاتنا.",
  unbanPrompt:
    "اكتب رسالة قصيرة لفريق الدعم تشرح فيها لماذا يجب رفع الحظر عنك:",
  unbanSent: "وصل طلبك إلى فريق الدعم وسنراجعه قريباً.",
  welcome:
    "أهلاً بك {name} في {chat}! نرجو احترام الجميع والالتزام بقواعد المجموعة.",
} as const;

export type MessageKey = keyof typeof ar;

const en: Record<MessageKey, string> = {
  aiError:
    "Sorry, I couldn't answer just now. Try again in a moment or use the menu.",
  aiSystemLocale: "Reply in English (friendly, concise).",
  back: "‹ Back",
  banDone: "{name} has been banned from {count} group(s).",
  banNotAdmin: "Only admins can use this command.",
  banNotFound:
    "I couldn't find that user. Reply to one of their messages with /ban.",
  banProtected: "Admins can't be banned.",
  banUsage: "Send /ban @username, or reply to someone's message with /ban.",
  faq: "FAQ",
  faqEmpty: "There are no FAQs yet.",
  faqPickQuestion: "Pick a question:",
  faqPickTopic: "Pick a topic:",
  faqTopic_academy: "Academy",
  faqTopic_general: "General",
  faqTopic_plus: "The IDEA Plus",
  faqTopic_store: "Store",
  faqTopic_suite: "The IDEA Suite",
  floodWarning:
    "{name}, you sent the same message several times. You're muted for five minutes.",
  linkApp: "The IDEA app",
  linkClub: "The Club on Telegram",
  links: "Links",
  linksTitle: "The IDEA links:",
  linkWebsite: "Website",
  menuGreeting: "Hi {name}! I'm Droid, The IDEA's assistant. How can I help?",
  menuGreetingAi:
    "Hi {name}! I'm Droid, The IDEA's assistant. Pick an option or just type your question.",
  newPost: "New post in {channel}:",
  newPostOpen: "Open the post",
  newsletterNowOff: "Newsletter turned off. We won't send you new posts.",
  newsletterNowOn: "Newsletter turned on. We'll send you our new posts.",
  newsletterOff: "Newsletter: off",
  newsletterOn: "Newsletter: on ✓",
  outOfStock: "Out of stock",
  plus: "The IDEA Plus",
  plusOpen: "Join The IDEA Plus",
  plusText:
    "The IDEA Plus is a monthly membership to rent games, books and movies, delivered to you and picked up when you're done. Each plan sets how many items you can have at once.",
  rental: "Rent with The IDEA Plus",
  search: "Search the store",
  searchEmpty: "No products match “{query}”.",
  searchPrompt: "Type the name of the product you're looking for:",
  searchResults: "Results for “{query}”:",
  searchUsage:
    "Send /search followed by a product name, e.g. /search PlayStation",
  stock: "In stock: {count}",
  unban: "Request unban",
  unbanDuplicate:
    "You already have an unban request under review. Our team will get back to you soon.",
  unbanNotBanned: "Your account isn't banned from our groups.",
  unbanPrompt:
    "Write a short message to our support team explaining why the ban should be lifted:",
  unbanSent: "Your request reached our support team; we'll review it soon.",
  welcome:
    "Welcome to {chat}, {name}! Please be respectful and follow the group rules.",
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
