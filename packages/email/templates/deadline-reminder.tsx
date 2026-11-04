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

export type DeadlineReminderLocale = "ar" | "en";

/**
 * A deadline coming up: an opportunity the member follows closes soon
 * (`opportunity_deadline`), or lines of their Travel Kit fall due
 * (`travel_due`).
 */
export type DeadlineReminderKind = "opportunity" | "travel";

export interface DeadlineReminderProps {
  /** The country of the trip (Travel Kit), already in the member's language. */
  readonly country?: string;
  /** The deadline or first due date, already formatted (Latin digits, Baghdad time). */
  readonly date: string;
  /** The page on the website: the opportunity, or the Travel Kit. */
  readonly href: string;
  readonly kind: DeadlineReminderKind;
  readonly locale: DeadlineReminderLocale;
  /** How many more lines are due besides `title` (Travel Kit), already formatted. */
  readonly more?: string;
  /** The opportunity, or the first line due. */
  readonly title: string;
}

interface Values {
  country: string;
  date: string;
  more?: string;
  title: string;
}

const copy = {
  ar: {
    dueLabel: "الموعد",
    opportunity: {
      button: "شوف الفرصة",
      heading: "راح تتسكّر قريب",
      intro: ({ date, title }: Values) =>
        `«${title}» اللي دتتابعها تتسكّر ${date}. لا تفوّتها وقدّم قبلها.`,
      preview: ({ title }: Values) => `«${title}» راح تتسكّر قريب`,
      subject: ({ title }: Values) => `راح تتسكّر قريب: ${title}`,
    },
    travel: {
      button: "افتح ملف سفرك",
      heading: "قرّب موعد بملف سفرك",
      intro: ({ country, date, more, title }: Values) =>
        more
          ? `«${title}» و${more} شغلات ثانية بملف سفرك لـ${country} قرّبت مواعيدها، وأولها ${date}.`
          : `«${title}» بملف سفرك لـ${country} موعده ${date}.`,
      note: "من تخلّص كل وحدة، علّم عليها بملفك.",
      preview: ({ title }: Values) => `قرّب موعد «${title}»`,
      subject: () => "قرّب موعد بملف سفرك",
    },
  },
  en: {
    dueLabel: "Due",
    opportunity: {
      button: "See the opportunity",
      heading: "Closing soon",
      intro: ({ date, title }: Values) =>
        `"${title}", which you follow, closes ${date}. Apply before then so you don't miss it.`,
      preview: ({ title }: Values) => `"${title}" closes soon`,
      subject: ({ title }: Values) => `Closing soon: ${title}`,
    },
    travel: {
      button: "Open your Travel Kit",
      heading: "Coming up in your Travel Kit",
      intro: ({ country, date, more, title }: Values) =>
        more
          ? `"${title}" and ${more} more for your ${country} trip are coming up; the first is due ${date}.`
          : `"${title}" for your ${country} trip is due ${date}.`,
      note: "Tick each one off in your kit once it's done.",
      preview: ({ title }: Values) => `"${title}" is due soon`,
      subject: () => "Coming up in your Travel Kit",
    },
  },
} as const;

const values = (props: DeadlineReminderProps): Values => ({
  country: props.country ?? "",
  date: props.date,
  more: props.more,
  title: props.title,
});

export const deadlineReminderSubject = (
  props: Pick<
    DeadlineReminderProps,
    "country" | "date" | "kind" | "locale" | "more" | "title"
  >
) => copy[props.locale][props.kind].subject(values({ ...props, href: "" }));

export const DeadlineReminderTemplate = (props: DeadlineReminderProps) => {
  const { href, kind, locale } = props;
  const text = copy[locale][kind];
  const dir = locale === "ar" ? "rtl" : "ltr";
  const vars = values(props);

  return (
    <Tailwind config={emailTailwindConfig}>
      <Html dir={dir} lang={locale}>
        <Head />
        <Preview>{text.preview(vars)}</Preview>
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
                <Text className="m-0 text-ink-muted">{text.intro(vars)}</Text>
                <Section className="my-6 border border-border border-solid p-4">
                  <Text className="m-0 font-semibold text-ink">
                    {props.title}
                  </Text>
                  <Text className="mt-1 mb-0 text-ink-muted text-sm">
                    {copy[locale].dueLabel}: {props.date}
                  </Text>
                </Section>
                <EmailButton href={href}>{text.button}</EmailButton>
                {kind === "travel" ? (
                  <Text className="mt-6 mb-0 text-ink-muted text-sm">
                    {copy[locale].travel.note}
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
