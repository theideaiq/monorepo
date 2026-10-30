import { render } from "@react-email/components";
import { ContactTemplate } from "@repo/email/templates/contact";
import {
  type OrderConfirmationProps,
  OrderConfirmationTemplate,
  orderConfirmationSubject,
} from "@repo/email/templates/order-confirmation";
import {
  ReminderTemplate,
  reminderSubject,
} from "@repo/email/templates/reminder";
import {
  StudentVerificationTemplate,
  studentVerificationSubject,
} from "@repo/email/templates/student-verification";
import { formatCurrency, formatDate } from "@repo/internationalization/format";
import type { Meta, StoryObj } from "@storybook/react";
import type { ReactElement } from "react";

/**
 * Every email in packages/email, rendered to HTML the way Resend sends it,
 * in Arabic and English side by side. Sample data only; the props match what
 * apps/api and apps/web pass (prices and dates already formatted with
 * @repo/internationalization/format).
 */
const meta = {
  parameters: { layout: "fullscreen" },
  title: "The IDEA Design/Emails",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;
type Lang = "ar" | "en";

interface Sample {
  email: ReactElement;
  subject: string;
}

const LANGS: readonly Lang[] = ["ar", "en"];
const SUPPORT = "hi@theideaiq.com";

/** Both languages side by side, each in its own frame like a mail client. */
const email = (make: (lang: Lang) => Sample): Story => ({
  loaders: [
    async () => ({
      html: await Promise.all(LANGS.map((lang) => render(make(lang).email))),
    }),
  ],
  render: (_args, { loaded }) => (
    <div className="grid gap-6 p-4 lg:grid-cols-2">
      {LANGS.map((lang, i) => (
        <figure className="grid gap-2" key={lang}>
          <figcaption
            className="text-muted-foreground text-sm"
            dir={lang === "ar" ? "rtl" : "ltr"}
            lang={lang}
          >
            {make(lang).subject}
          </figcaption>
          <iframe
            className="h-[760px] w-full rounded-md border bg-white"
            srcDoc={(loaded.html as string[])[i]}
            title={make(lang).subject}
          />
        </figure>
      ))}
    </div>
  ),
});

/**
 * The contact form's note to the team inbox. The template's own text is
 * English (it goes to staff); the samples show a message written in each
 * language.
 */
const contact = {
  ar: {
    email: "sara.ahmed@example.com",
    message:
      "مرحباً، نرغب بحجز قاعة في The IDEA لورشة عمل لعشرين شخصاً. هل يمكن إرسال الأسعار والأوقات المتاحة؟",
    name: "سارة أحمد",
  },
  en: {
    email: "omar.hassan@example.com",
    message:
      "Hello, we'd like to book a room at The IDEA for a workshop of twenty people. Could you send prices and available times?",
    name: "Omar Hassan",
  },
} as const;

export const Contact = email((lang) => ({
  email: (
    <ContactTemplate
      date={formatDate("2026-11-05T09:00:00Z", lang, "long")}
      email={contact[lang].email}
      message={contact[lang].message}
      name={contact[lang].name}
    />
  ),
  subject: `Contact form (business): ${contact[lang].name}`,
}));

const order = (lang: Lang): OrderConfirmationProps => {
  const price = (amount: number) => formatCurrency(amount, lang);
  const ar = lang === "ar";
  return {
    address: {
      address: ar
        ? "شارع 52، قرب ساحة الحرية، بناية 14"
        : "Street 52, near Freedom Square, building 14",
      city: ar ? "الكرادة" : "Karrada",
      fullName: ar ? "سارة أحمد" : "Sara Ahmed",
      governorate: ar ? "بغداد" : "Baghdad",
      notes: ar ? "الرجاء الاتصال قبل الوصول" : "Please call before arriving",
      phone: "+964 770 123 4567",
    },
    items: [
      {
        details: ar ? "التخزين: 2 تيرابايت" : "Storage: 2 TB",
        name: ar ? "بلايستيشن 5 برو" : "PlayStation 5 Pro",
        quantity: 1,
        total: price(1_150_000),
      },
      {
        details: ar ? "اللون: أسود" : "Color: Black",
        name: ar ? "يد تحكم DualSense" : "DualSense controller",
        quantity: 2,
        total: price(190_000),
      },
    ],
    locale: lang,
    orderNumber: "#10042",
    shipping: price(5000),
    subtotal: price(1_340_000),
    supportEmail: SUPPORT,
    total: price(1_345_000),
  };
};

export const OrderConfirmation = email((lang) => ({
  email: <OrderConfirmationTemplate {...order(lang)} />,
  subject: orderConfirmationSubject(lang, "#10042"),
}));

/** A partner's student verification, confirmed, with the link to delete it. */
export const StudentVerification = email((lang) => ({
  email: (
    <StudentVerificationTemplate
      deleteUrl="https://theideaiq.com/verify/7c1e/delete?token=sample"
      locale={lang}
      outcome="verified"
      partner={lang === "ar" ? "مكتبة دجلة" : "Tigris Books"}
      university={
        lang === "ar"
          ? "الجامعة الأمريكية في بغداد"
          : "American University of Baghdad"
      }
      until={formatDate("2027-06-30T12:00:00Z", lang, "long")}
    />
  ),
  subject: studentVerificationSubject(lang, "verified"),
}));

const records = (lang: Lang) => [
  {
    href: "https://theideaiq.com/store/kind-of-blue#reviews",
    name:
      lang === "ar" ? "مايلز ديفيس: Kind of Blue" : "Miles Davis: Kind of Blue",
  },
  {
    href: "https://theideaiq.com/store/blue-train#reviews",
    name:
      lang === "ar" ? "جون كولترين: Blue Train" : "John Coltrane: Blue Train",
  },
];

/** Three days after delivery: review what you bought. */
export const ReviewRequest = email((lang) => ({
  email: (
    <ReminderTemplate
      action={records(lang)[0].href}
      items={records(lang)}
      kind="review"
      locale={lang}
    />
  ),
  subject: reminderSubject("review", lang),
}));

/** A cart left for a day (Passes that allow news and offers). */
export const CartReminder = email((lang) => ({
  email: (
    <ReminderTemplate
      action="https://theideaiq.com/cart"
      items={records(lang).map((item, index) => ({
        ...item,
        quantity: index + 1,
      }))}
      kind="cart"
      locale={lang}
      settings="https://theideaiq.com/pass/settings#phone"
    />
  ),
  subject: reminderSubject("cart", lang),
}));
