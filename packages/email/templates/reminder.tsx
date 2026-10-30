import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { emailTailwindConfig } from "../brand";
import { EmailButton, EmailHeader } from "../components";

export type ReminderLocale = "ar" | "en";

/** A review request after delivery, or a reminder of a cart left. */
export type ReminderKind = "cart" | "review";

export interface ReminderItem {
  /** Where the item's link goes (its review form, or the product). */
  readonly href: string;
  readonly name: string;
  readonly quantity?: number;
}

export interface ReminderProps {
  /** The main button: the first item's review form, or the cart. */
  readonly action: string;
  readonly items: readonly ReminderItem[];
  readonly kind: ReminderKind;
  readonly locale: ReminderLocale;
  /** Pass → Settings, to stop news and offers (cart reminders). */
  readonly settings?: string;
}

const copy = {
  ar: {
    cart: {
      button: "أكمل طلبك",
      heading: "ما زالت في سلتك",
      intro: "تركت هذه في سلتك. أكمل طلبك متى شئت، فقد تنفد الكميات.",
      preview: "ما زالت أغراضك في السلة",
      stop: "لا تريد هذه الرسائل؟ أوقف الأخبار والعروض من الإعدادات.",
      subject: "ما زالت في سلتك",
    },
    review: {
      button: "اكتب مراجعتك",
      heading: "كيف وجدت طلبك؟",
      intro:
        "وصلك طلبك قبل أيام. شاركنا رأيك ليساعد غيرك على الاختيار، ولك 500 گلوب على المراجعة مع صورة.",
      preview: "شاركنا رأيك فيما اشتريت",
      stop: "",
      subject: "كيف وجدت طلبك؟",
    },
  },
  en: {
    cart: {
      button: "Finish your order",
      heading: "Still in your cart",
      intro:
        "You left these in your cart. Finish your order whenever you like; stock can run out.",
      preview: "Your cart is waiting",
      stop: "Don't want these? Turn off news and offers in Settings.",
      subject: "Still in your cart",
    },
    review: {
      button: "Write your review",
      heading: "How was your order?",
      intro:
        "Your order arrived a few days ago. Tell others what you think, and get 500 Bulbs for a review with a photo.",
      preview: "Tell us what you think of what you bought",
      stop: "",
      subject: "How was your order?",
    },
  },
} as const;

export const reminderSubject = (kind: ReminderKind, locale: ReminderLocale) =>
  copy[locale][kind].subject;

export const ReminderTemplate = ({
  action,
  items,
  kind,
  locale,
  settings,
}: ReminderProps) => {
  const text = copy[locale][kind];
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <Tailwind config={emailTailwindConfig}>
      <Html dir={dir} lang={locale}>
        <Head />
        <Preview>{text.preview}</Preview>
        <Body className="bg-surface font-sans">
          <Container
            className="mx-auto max-w-[560px] py-12"
            style={{ direction: dir }}
          >
            <EmailHeader />
            <Section className="border border-border border-t-0 border-solid">
              <Section className="bg-surface-raised p-8">
                <Text className="mt-0 mb-4 font-semibold text-2xl text-ink">
                  {text.heading}
                </Text>
                <Text className="m-0 text-ink-muted">{text.intro}</Text>
                <Section className="my-6">
                  {items.map((item) => (
                    <Text className="my-1 text-ink" key={item.href}>
                      <Link className="text-ink underline" href={item.href}>
                        {item.name}
                      </Link>
                      {item.quantity && item.quantity > 1
                        ? ` × ${item.quantity}`
                        : null}
                    </Text>
                  ))}
                </Section>
                <EmailButton href={action}>{text.button}</EmailButton>
                {settings && text.stop ? (
                  <Text className="mt-6 mb-0 text-ink-muted text-sm">
                    <Link className="text-ink-muted underline" href={settings}>
                      {text.stop}
                    </Link>
                  </Text>
                ) : null}
              </Section>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};
