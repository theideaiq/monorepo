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
import { brand, emailFont } from "../brand";
import { EmailHeader } from "../components";

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
    help: "للمساعدة راسلنا على",
    reason: "تصلك هذه الرسالة لأنك وافقت على تلقّي رسائل The IDEA البريدية.",
    unsubscribe: "إلغاء الاشتراك في هذه الرسائل",
  },
  en: {
    help: "Questions? Write to",
    reason: "You're receiving this because you agreed to email from The IDEA.",
    unsubscribe: "Unsubscribe from these emails",
  },
} as const;

/**
 * A marketing campaign in The IDEA's branding: the pink header, the
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
  const text = footer[locale];

  return (
    <Html dir={dir} lang={locale}>
      <Head>
        <title>{subject}</title>
      </Head>
      <Preview>{preview ?? subject}</Preview>
      <Body
        style={{
          backgroundColor: brand.surface,
          fontFamily: emailFont,
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: brand.surfaceRaised,
            borderRadius: 12,
            margin: "0 auto",
            maxWidth: 600,
            overflow: "hidden",
          }}
        >
          <EmailHeader alt={brandName} href={siteUrl} />
          <Section
            style={{
              direction: dir,
              padding: "8px 32px 24px",
              textAlign: align,
            }}
          >
            <Markdown
              markdownContainerStyles={{
                color: brand.ink,
                fontSize: 16,
                lineHeight: "1.7",
              }}
              markdownCustomStyles={{
                h1: { color: brand.ink, fontSize: 26, lineHeight: "1.3" },
                h2: { color: brand.ink, fontSize: 20, lineHeight: "1.35" },
                link: { color: brand.pinkText },
              }}
            >
              {body}
            </Markdown>
          </Section>
          <Hr style={{ borderColor: brand.border, margin: 0 }} />
          <Section
            style={{ direction: dir, padding: "20px 32px", textAlign: align }}
          >
            <Text
              style={{ color: brand.inkMuted, fontSize: 12, margin: "0 0 8px" }}
            >
              {text.reason}
            </Text>
            <Text
              style={{ color: brand.inkMuted, fontSize: 12, margin: "0 0 8px" }}
            >
              {text.help}{" "}
              <Link
                href={`mailto:${supportEmail}`}
                style={{ color: brand.inkMuted }}
              >
                {supportEmail}
              </Link>
            </Text>
            <Link
              href={unsubscribeUrl}
              style={{
                color: brand.inkMuted,
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
