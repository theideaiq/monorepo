import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Markdown,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface CampaignTemplateProps {
  /** Markdown, written by the marketing team in the back office. */
  readonly body: string;
  readonly brandName: string;
  /** Language of the footer and the text direction. */
  readonly locale: "ar" | "en";
  /** Shown in the inbox list after the subject. */
  readonly preview?: string;
  readonly siteUrl: string;
  readonly subject: string;
  readonly supportEmail: string;
  /** One-click unsubscribe link, signed for this recipient. */
  readonly unsubscribeUrl: string;
}

const footer = {
  ar: {
    reason: "تصلك هذه الرسالة لأنك وافقت على تلقّي رسائل The IDEA البريدية.",
    unsubscribe: "إلغاء الاشتراك في هذه الرسائل",
    help: "للمساعدة راسلنا على",
  },
  en: {
    reason: "You're receiving this because you agreed to email from The IDEA.",
    unsubscribe: "Unsubscribe from these emails",
    help: "Questions? Write to",
  },
} as const;

// Brand colours (packages/design-system/styles/globals.css).
const BRAND_YELLOW = "#f4cf08";
const BRAND_INK = "#0f1014";
const PINK = "#e91e63";
const ARABIC_FONT =
  "Cairo, 'Segoe UI', Tahoma, 'Noto Sans Arabic', Arial, sans-serif";
const LATIN_FONT =
  "Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

/**
 * A marketing campaign in The IDEA's branding: a yellow logo bar, the
 * Markdown body and a footer with the one-click unsubscribe link.
 */
export const CampaignTemplate = ({
  body,
  brandName,
  locale,
  preview,
  siteUrl,
  subject,
  supportEmail,
  unsubscribeUrl,
}: CampaignTemplateProps) => {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const fontFamily = locale === "ar" ? ARABIC_FONT : LATIN_FONT;
  const text = footer[locale];

  return (
    <Html dir={dir} lang={locale}>
      <Head>
        <title>{subject}</title>
      </Head>
      <Preview>{preview ?? subject}</Preview>
      <Body
        style={{
          backgroundColor: "#f4f4f5",
          fontFamily,
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 12,
            margin: "0 auto",
            maxWidth: 600,
            overflow: "hidden",
          }}
        >
          <Section
            style={{ backgroundColor: BRAND_YELLOW, padding: "20px 32px" }}
          >
            <Link
              href={siteUrl}
              style={{
                color: BRAND_INK,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                textDecoration: "none",
              }}
            >
              {brandName}
            </Link>
          </Section>
          <Section
            style={{ direction: dir, padding: "8px 32px 24px", textAlign: align }}
          >
            <Markdown
              markdownContainerStyles={{
                color: "#27272a",
                fontSize: 16,
                lineHeight: "1.7",
              }}
              markdownCustomStyles={{
                h1: { color: BRAND_INK, fontSize: 26, lineHeight: "1.3" },
                h2: { color: BRAND_INK, fontSize: 20, lineHeight: "1.35" },
                link: { color: PINK },
              }}
            >
              {body}
            </Markdown>
          </Section>
          <Hr style={{ borderColor: "#e4e4e7", margin: 0 }} />
          <Section
            style={{ direction: dir, padding: "20px 32px", textAlign: align }}
          >
            <Text style={{ color: "#71717a", fontSize: 12, margin: "0 0 8px" }}>
              {text.reason}
            </Text>
            <Text style={{ color: "#71717a", fontSize: 12, margin: "0 0 8px" }}>
              {text.help}{" "}
              <Link href={`mailto:${supportEmail}`} style={{ color: "#71717a" }}>
                {supportEmail}
              </Link>
            </Text>
            <Link
              href={unsubscribeUrl}
              style={{
                color: "#71717a",
                fontSize: 12,
                textDecoration: "underline",
              }}
            >
              {text.unsubscribe}
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

CampaignTemplate.PreviewProps = {
  body: "# New arrivals\n\nThe latest **games** and **books** are in the Megastore.\n\n[Shop now](https://theideaiq.com)",
  brandName: "The IDEA",
  locale: "en",
  siteUrl: "https://theideaiq.com",
  subject: "New arrivals at The IDEA",
  supportEmail: "hi@theideaiq.com",
  unsubscribeUrl: "https://theideaiq.com",
} satisfies CampaignTemplateProps;

// biome-ignore lint/complexity/noRedundantDefaultExport: React Email's preview server loads templates through their default export.
export default CampaignTemplate;
