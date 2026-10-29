import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { emailTailwindConfig } from "../brand";
import { EmailButton, EmailHeader } from "../components";

export type OrderEmailLocale = "ar" | "en";

export interface OrderConfirmationItem {
  /** Variant details, e.g. "Color: Black". */
  readonly details?: string;
  readonly name: string;
  readonly quantity: number;
  /** Line total, already formatted. */
  readonly total: string;
}

export interface OrderConfirmationAddress {
  readonly address: string;
  readonly city?: string;
  readonly fullName: string;
  /** Governorate name in the email's language. */
  readonly governorate: string;
  readonly notes?: string;
  readonly phone: string;
}

export interface OrderConfirmationProps {
  readonly address: OrderConfirmationAddress;
  /** Paid in cash on delivery (not paid yet). */
  readonly cash?: boolean;
  readonly items: readonly OrderConfirmationItem[];
  readonly locale: OrderEmailLocale;
  /** "#10042" */
  readonly orderNumber: string;
  /** Already formatted amounts. */
  readonly shipping: string;
  readonly subtotal: string;
  readonly supportEmail: string;
  readonly total: string;
}

const copy = {
  ar: {
    address: "عنوان التوصيل",
    contact: "راسلنا",
    greeting: (name: string) => `شكراً لك يا ${name}!`,
    heading: (number: string) => `تم تأكيد طلبك ${number}`,
    intro: "استلمنا دفعتك وبدأنا تجهيز طلبك. سنتواصل معك عند خروجه للتوصيل.",
    introCash:
      "استلمنا طلبك وبدأنا تجهيزه. ستدفع نقداً عند استلامه، وسنتواصل معك عند خروجه للتوصيل.",
    notes: "ملاحظات",
    preview: (number: string) => `تم تأكيد طلبك ${number} من ايديا`,
    quantity: (count: number) => `الكمية: ${count}`,
    shipping: "التوصيل",
    subtotal: "المجموع الفرعي",
    support: (email: string) =>
      `لأي سؤال عن طلبك، راسلنا على ${email} واذكر رقم الطلب.`,
    total: "الإجمالي المدفوع",
    totalCash: "الإجمالي المستحق نقداً",
  },
  en: {
    address: "Delivery address",
    contact: "Email us",
    greeting: (name: string) => `Thank you, ${name}!`,
    heading: (number: string) => `Your order ${number} is confirmed`,
    intro:
      "We received your payment and started preparing your order. We'll get in touch when it's out for delivery.",
    introCash:
      "We received your order and started preparing it. You'll pay in cash when it arrives; we'll get in touch when it's out for delivery.",
    notes: "Notes",
    preview: (number: string) => `Your The IDEA order ${number} is confirmed`,
    quantity: (count: number) => `Qty: ${count}`,
    shipping: "Delivery",
    subtotal: "Subtotal",
    support: (email: string) =>
      `Questions about your order? Email ${email} with your order number.`,
    total: "Total paid",
    totalCash: "Total to pay in cash",
  },
} as const;

export const orderConfirmationSubject = (
  locale: OrderEmailLocale,
  orderNumber: string
) => copy[locale].heading(orderNumber);

export const OrderConfirmationTemplate = ({
  address,
  cash = false,
  items,
  locale,
  orderNumber,
  shipping,
  subtotal,
  supportEmail,
  total,
}: OrderConfirmationProps) => {
  const text = copy[locale];
  const intro = cash ? text.introCash : text.intro;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const end = locale === "ar" ? "left" : "right";

  return (
    <Tailwind config={emailTailwindConfig}>
      <Html dir={dir} lang={locale}>
        <Head />
        <Preview>{text.preview(orderNumber)}</Preview>
        <Body className="bg-surface font-sans">
          <Container
            className="mx-auto max-w-[560px] py-12"
            style={{ direction: dir }}
          >
            <EmailHeader />
            <Section
              className="bg-surface-raised p-8"
              style={{ textAlign: align }}
            >
              <Text className="mt-0 mb-2 font-semibold text-2xl text-ink">
                {text.heading(orderNumber)}
              </Text>
              <Text className="m-0 text-ink">
                {text.greeting(address.fullName)}
              </Text>
              <Text className="mt-2 text-ink-muted">{intro}</Text>

              <Hr className="my-6" />

              {items.map((item) => (
                <Row
                  className="mb-3"
                  key={`${item.name}-${item.details ?? ""}`}
                >
                  <Column style={{ textAlign: align }}>
                    <Text className="m-0 font-medium text-ink">
                      {item.name}
                    </Text>
                    {item.details ? (
                      <Text className="m-0 text-ink-muted text-sm">
                        {item.details}
                      </Text>
                    ) : null}
                    <Text className="m-0 text-ink-muted text-sm">
                      {text.quantity(item.quantity)}
                    </Text>
                  </Column>
                  <Column style={{ textAlign: end, verticalAlign: "top" }}>
                    <Text className="m-0 text-ink">{item.total}</Text>
                  </Column>
                </Row>
              ))}

              <Hr className="my-6" />

              <Row>
                <Column style={{ textAlign: align }}>
                  <Text className="m-0 text-ink-muted">{text.subtotal}</Text>
                </Column>
                <Column style={{ textAlign: end }}>
                  <Text className="m-0 text-ink">{subtotal}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={{ textAlign: align }}>
                  <Text className="m-0 text-ink-muted">{text.shipping}</Text>
                </Column>
                <Column style={{ textAlign: end }}>
                  <Text className="m-0 text-ink">{shipping}</Text>
                </Column>
              </Row>
              <Row className="mt-2">
                <Column style={{ textAlign: align }}>
                  <Text className="m-0 font-semibold text-ink">
                    {cash ? text.totalCash : text.total}
                  </Text>
                </Column>
                <Column style={{ textAlign: end }}>
                  <Text className="m-0 font-semibold text-ink">{total}</Text>
                </Column>
              </Row>

              <Hr className="my-6" />

              <Text className="mt-0 mb-1 font-semibold text-ink">
                {text.address}
              </Text>
              <Text className="m-0 text-ink">{address.fullName}</Text>
              <Text
                className="m-0 text-ink"
                style={{ direction: "ltr", textAlign: align }}
              >
                {address.phone}
              </Text>
              <Text className="m-0 text-ink">
                {[address.governorate, address.city]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text className="m-0 text-ink">{address.address}</Text>
              {address.notes ? (
                <Text className="m-0 text-ink-muted">
                  {text.notes}: {address.notes}
                </Text>
              ) : null}

              <Hr className="my-6" />

              <Text className="mt-0 mb-4 text-ink-muted text-sm">
                {text.support(supportEmail)}
              </Text>
              <EmailButton href={`mailto:${supportEmail}`}>
                {text.contact}
              </EmailButton>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};
