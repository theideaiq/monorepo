import { render } from "@react-email/components";
import { CampaignTemplate } from "@repo/email/templates/campaign";
import { ContactTemplate } from "@repo/email/templates/contact";
import {
  type OrderConfirmationProps,
  OrderConfirmationTemplate,
  orderConfirmationSubject,
} from "@repo/email/templates/order-confirmation";
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
const SITE = "https://theideaiq.com";
const SUPPORT = "hi@theideaiq.com";
const UNSUBSCRIBE = `${SITE}/unsubscribe?token=sample`;

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

const campaign = {
  ar: {
    body: "# وصل الجديد إلى الميغاستور\n\nأحدث **الألعاب** و**الكتب** صارت متوفرة الآن، مع توصيل إلى كل المحافظات.\n\n- بلايستيشن 5 برو\n- يد تحكم DualSense بألوان جديدة\n- روايات عربية مختارة لهذا الشهر\n\n[تسوّق الآن](https://theideaiq.com/ar/store)",
    preview: "أحدث الألعاب والكتب صارت متوفرة في The IDEA",
    subject: "وصل الجديد إلى The IDEA",
  },
  en: {
    body: "# New arrivals in the Megastore\n\nThe latest **games** and **books** are in, with delivery to every governorate.\n\n- PlayStation 5 Pro\n- DualSense controllers in new colors\n- This month's picks of Arabic fiction\n\n[Shop now](https://theideaiq.com/en/store)",
    preview: "The latest games and books are in at The IDEA",
    subject: "New arrivals at The IDEA",
  },
} as const;

export const Campaign = email((lang) => ({
  email: (
    <CampaignTemplate
      body={campaign[lang].body}
      brandName="The IDEA"
      locale={lang}
      preview={campaign[lang].preview}
      siteUrl={SITE}
      subject={campaign[lang].subject}
      supportEmail={SUPPORT}
      unsubscribeUrl={UNSUBSCRIBE}
    />
  ),
  subject: campaign[lang].subject,
}));

/**
 * The contact form's note to the team inbox. The template's own text is
 * English (it goes to staff); the samples show a message written in each
 * language.
 */
const contact = {
  ar: {
    email: "sara.ahmed@example.com",
    message:
      "مرحباً، نرغب بحجز قاعة في The IDEA Suite لورشة عمل لعشرين شخصاً. هل يمكن إرسال الأسعار والأوقات المتاحة؟",
    name: "سارة أحمد",
  },
  en: {
    email: "omar.hassan@example.com",
    message:
      "Hello, we'd like to book a room at The IDEA Suite for a workshop of twenty people. Could you send prices and available times?",
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
  subject: `Contact form (suite): ${contact[lang].name}`,
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
