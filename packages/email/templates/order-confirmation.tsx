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
    greeting: (name: string) => `شكراً لك يا ${name}!`,
    heading: (number: string) => `تم تأكيد طلبك ${number}`,
    intro: "استلمنا دفعتك وبدأنا تجهيز طلبك. سنتواصل معك عند خروجه للتوصيل.",
    notes: "ملاحظات",
    preview: (number: string) => `تم تأكيد طلبك ${number} من The IDEA`,
    quantity: (count: number) => `الكمية: ${count}`,
    shipping: "التوصيل",
    subtotal: "المجموع الفرعي",
    support: (email: string) =>
      `لأي سؤال عن طلبك، راسلنا على ${email} واذكر رقم الطلب.`,
    total: "الإجمالي المدفوع",
  },
  en: {
    address: "Delivery address",
    greeting: (name: string) => `Thank you, ${name}!`,
    heading: (number: string) => `Your order ${number} is confirmed`,
    intro:
      "We received your payment and started preparing your order. We'll get in touch when it's out for delivery.",
    notes: "Notes",
    preview: (number: string) => `Your The IDEA order ${number} is confirmed`,
    quantity: (count: number) => `Qty: ${count}`,
    shipping: "Delivery",
    subtotal: "Subtotal",
    support: (email: string) =>
      `Questions about your order? Email ${email} with your order number.`,
    total: "Total paid",
  },
} as const;

export const orderConfirmationSubject = (
  locale: OrderEmailLocale,
  orderNumber: string
) => copy[locale].heading(orderNumber);

export const OrderConfirmationTemplate = ({
  address,
  items,
  locale,
  orderNumber,
  shipping,
  subtotal,
  supportEmail,
  total,
}: OrderConfirmationProps) => {
  const text = copy[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const end = locale === "ar" ? "left" : "right";

  return (
    <Tailwind>
      <Html dir={dir} lang={locale}>
        <Head />
        <Preview>{text.preview(orderNumber)}</Preview>
        <Body className="bg-zinc-50 font-sans">
          <Container
            className="mx-auto max-w-[560px] py-12"
            style={{ direction: dir }}
          >
            <Section
              className="rounded-md bg-white p-8"
              style={{ textAlign: align }}
            >
              <Text className="mt-0 mb-2 font-semibold text-2xl text-zinc-950">
                {text.heading(orderNumber)}
              </Text>
              <Text className="m-0 text-zinc-700">
                {text.greeting(address.fullName)}
              </Text>
              <Text className="mt-2 text-zinc-500">{text.intro}</Text>

              <Hr className="my-6" />

              {items.map((item) => (
                <Row
                  className="mb-3"
                  key={`${item.name}-${item.details ?? ""}`}
                >
                  <Column style={{ textAlign: align }}>
                    <Text className="m-0 font-medium text-zinc-950">
                      {item.name}
                    </Text>
                    {item.details ? (
                      <Text className="m-0 text-sm text-zinc-500">
                        {item.details}
                      </Text>
                    ) : null}
                    <Text className="m-0 text-sm text-zinc-500">
                      {text.quantity(item.quantity)}
                    </Text>
                  </Column>
                  <Column style={{ textAlign: end, verticalAlign: "top" }}>
                    <Text className="m-0 text-zinc-950">{item.total}</Text>
                  </Column>
                </Row>
              ))}

              <Hr className="my-6" />

              <Row>
                <Column style={{ textAlign: align }}>
                  <Text className="m-0 text-zinc-500">{text.subtotal}</Text>
                </Column>
                <Column style={{ textAlign: end }}>
                  <Text className="m-0 text-zinc-700">{subtotal}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={{ textAlign: align }}>
                  <Text className="m-0 text-zinc-500">{text.shipping}</Text>
                </Column>
                <Column style={{ textAlign: end }}>
                  <Text className="m-0 text-zinc-700">{shipping}</Text>
                </Column>
              </Row>
              <Row className="mt-2">
                <Column style={{ textAlign: align }}>
                  <Text className="m-0 font-semibold text-zinc-950">
                    {text.total}
                  </Text>
                </Column>
                <Column style={{ textAlign: end }}>
                  <Text className="m-0 font-semibold text-zinc-950">
                    {total}
                  </Text>
                </Column>
              </Row>

              <Hr className="my-6" />

              <Text className="mt-0 mb-1 font-semibold text-zinc-950">
                {text.address}
              </Text>
              <Text className="m-0 text-zinc-700">{address.fullName}</Text>
              <Text
                className="m-0 text-zinc-700"
                style={{ direction: "ltr", textAlign: align }}
              >
                {address.phone}
              </Text>
              <Text className="m-0 text-zinc-700">
                {[address.governorate, address.city]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text className="m-0 text-zinc-700">{address.address}</Text>
              {address.notes ? (
                <Text className="m-0 text-zinc-500">
                  {text.notes}: {address.notes}
                </Text>
              ) : null}

              <Hr className="my-6" />

              <Text className="m-0 text-sm text-zinc-500">
                {text.support(supportEmail)}
              </Text>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

OrderConfirmationTemplate.PreviewProps = {
  address: {
    address: "شارع 52، قرب ساحة الحرية",
    city: "الكرادة",
    fullName: "سارة أحمد",
    governorate: "بغداد",
    phone: "+964 770 000 0000",
  },
  items: [
    { name: "بلايستيشن 5", quantity: 1, total: "720,000 د.ع." },
    {
      details: "اللون: أسود",
      name: "يد تحكم DualSense",
      quantity: 2,
      total: "190,000 د.ع.",
    },
  ],
  locale: "ar",
  orderNumber: "#10042",
  shipping: "5,000 د.ع.",
  subtotal: "910,000 د.ع.",
  supportEmail: "hi@theideaiq.com",
  total: "915,000 د.ع.",
} satisfies OrderConfirmationProps;

// biome-ignore lint/complexity/noRedundantDefaultExport: React Email's preview server loads templates through their default export.
export default OrderConfirmationTemplate;
