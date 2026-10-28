import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { emailTailwindConfig } from "../brand";
import { EmailHeader } from "../components";

export type StudentCodeLocale = "ar" | "en";

export interface StudentCodeProps {
  /** The 8-digit code. */
  readonly code: string;
  readonly locale: StudentCodeLocale;
  /** The university's name in the email's language. */
  readonly university: string;
}

const copy = {
  ar: {
    expires: "ينتهي هذا الرمز بعد 15 دقيقة. إن لم تطلبه، تجاهل هذه الرسالة.",
    heading: "رمز التحقق من صفة الطالب",
    intro: (university: string) =>
      `أدخل هذا الرمز في بطاقة Pass الخاصة بك لتأكيد أنك طالب في ${university}:`,
    preview: (code: string) => `رمز التحقق: ${code}`,
  },
  en: {
    expires:
      "The code expires in 15 minutes. If you didn't ask for it, ignore this email.",
    heading: "Your student verification code",
    intro: (university: string) =>
      `Enter this code in your Pass to confirm you're a student at ${university}:`,
    preview: (code: string) => `Your verification code: ${code}`,
  },
} as const;

export const studentCodeSubject = (locale: StudentCodeLocale) =>
  copy[locale].heading;

export const StudentCodeTemplate = ({
  code,
  locale,
  university,
}: StudentCodeProps) => {
  const text = copy[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <Tailwind config={emailTailwindConfig}>
      <Html dir={dir} lang={locale}>
        <Head />
        <Preview>{text.preview(code)}</Preview>
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
                <Text className="m-0 text-ink-muted">
                  {text.intro(university)}
                </Text>
                <Text
                  className="my-6 font-semibold text-3xl text-ink"
                  style={{ direction: "ltr", letterSpacing: "0.3em" }}
                >
                  {code}
                </Text>
                <Text className="m-0 text-ink-muted text-sm">
                  {text.expires}
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};
