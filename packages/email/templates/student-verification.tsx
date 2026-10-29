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
import { EmailButton, EmailHeader } from "../components";

export type StudentVerificationLocale = "ar" | "en";

/** What happened to a partner's student verification. */
export type StudentVerificationOutcome = "received" | "rejected" | "verified";

export interface StudentVerificationProps {
  /** "Delete this verification" (verified only). */
  readonly deleteUrl?: string;
  readonly locale: StudentVerificationLocale;
  readonly outcome: StudentVerificationOutcome;
  /** The partner's name. */
  readonly partner: string;
  /** Why a document wasn't accepted (rejected only). */
  readonly reason?: string;
  /** The university's name in the email's language. */
  readonly university: string;
  /** Until when, already formatted (verified only). */
  readonly until?: string;
}

const copy = {
  ar: {
    delete: "حذف هذا التحقق",
    deleteNote:
      "إن لم تطلب هذا التحقق أو لم تعد تريده، احذفه وسنُعلم الجهة بذلك. لا تحصل الجهة إلا على صفتك كطالب والجامعة وتاريخ الانتهاء.",
    heading: {
      received: "استلمنا مستندك",
      rejected: "لم نتمكن من التحقق من صفتك كطالب",
      verified: "تم التحقق من صفتك كطالب",
    },
    reason: (reason: string) => `السبب: ${reason}`,
    received: (partner: string) =>
      `نراجع مستندك للتحقق من صفتك كطالب لدى ${partner}، عادةً خلال يوم عمل واحد. سنراسلك بالنتيجة.`,
    rejected: (partner: string, university: string) =>
      `لم نتمكن من قبول مستندك للتحقق من أنك طالب في ${university} لدى ${partner}. يمكنك المحاولة مرة أخرى من موقع ${partner}.`,
    verified: (partner: string, university: string, until: string) =>
      `أكدنا لـ ${partner} أنك طالب في ${university}، حتى ${until}.`,
  },
  en: {
    delete: "Delete this verification",
    deleteNote:
      "If you didn't ask for this or no longer want it, delete it and we'll tell them. They get only your student status, the university and the expiry date.",
    heading: {
      received: "We received your document",
      rejected: "We couldn't verify you as a student",
      verified: "You're verified as a student",
    },
    reason: (reason: string) => `The reason: ${reason}`,
    received: (partner: string) =>
      `We're checking your document to verify you as a student for ${partner}, usually within 1 working day. We'll email you the result.`,
    rejected: (partner: string, university: string) =>
      `We couldn't accept your document to verify you as a student at ${university} for ${partner}. You can try again from ${partner}'s website.`,
    verified: (partner: string, university: string, until: string) =>
      `We confirmed to ${partner} that you're a student at ${university}, until ${until}.`,
  },
} as const;

export const studentVerificationSubject = (
  locale: StudentVerificationLocale,
  outcome: StudentVerificationOutcome
) => copy[locale].heading[outcome];

const message = (props: StudentVerificationProps) => {
  const text = copy[props.locale];
  if (props.outcome === "verified") {
    return text.verified(props.partner, props.university, props.until ?? "");
  }
  if (props.outcome === "rejected") {
    return text.rejected(props.partner, props.university);
  }
  return text.received(props.partner);
};

/**
 * A partner's student verification: verified (with the link to delete
 * it), a document received, or a document not accepted.
 */
export const StudentVerificationTemplate = (
  props: StudentVerificationProps
) => {
  const { deleteUrl, locale, outcome, reason } = props;
  const text = copy[locale];
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <Tailwind config={emailTailwindConfig}>
      <Html dir={dir} lang={locale}>
        <Head />
        <Preview>{text.heading[outcome]}</Preview>
        <Body className="bg-surface font-sans">
          <Container
            className="mx-auto max-w-[560px] py-12"
            style={{ direction: dir }}
          >
            <EmailHeader />
            <Section className="border border-border border-t-0 border-solid">
              <Section className="bg-surface-raised p-8">
                <Text className="mt-0 mb-4 font-semibold text-2xl text-ink">
                  {text.heading[outcome]}
                </Text>
                <Text className="m-0 text-ink-muted">{message(props)}</Text>
                {outcome === "rejected" && reason ? (
                  <Text className="mt-4 mb-0 text-ink-muted">
                    {text.reason(reason)}
                  </Text>
                ) : null}
                {outcome === "verified" && deleteUrl ? (
                  <>
                    <Section className="my-6">
                      <EmailButton href={deleteUrl}>{text.delete}</EmailButton>
                    </Section>
                    <Text className="m-0 text-ink-muted text-sm">
                      {text.deleteNote}
                    </Text>
                  </>
                ) : null}
              </Section>
            </Section>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};
