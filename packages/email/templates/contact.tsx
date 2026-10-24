import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { emailTailwindConfig } from "../brand";

interface ContactTemplateProps {
  /** Preferred meeting date, already formatted. */
  readonly date?: string;
  readonly email: string;
  readonly message: string;
  readonly name: string;
}

export const ContactTemplate = ({
  date,
  name,
  email,
  message,
}: ContactTemplateProps) => (
  <Tailwind config={emailTailwindConfig}>
    <Html>
      <Head />
      <Preview>New email from {name}</Preview>
      <Body className="bg-surface font-sans">
        <Container className="mx-auto py-12">
          <Section className="mt-8 rounded-md bg-border p-px">
            <Section className="rounded-[5px] bg-surface-raised p-8">
              <Text className="mt-0 mb-4 font-semibold text-2xl text-ink">
                New email from {name}
              </Text>
              <Text className="m-0 text-ink-muted">
                {name} ({email}) has sent you a message:
              </Text>
              {date ? (
                <Text className="m-0 text-ink-muted">
                  Preferred date: {date}
                </Text>
              ) : null}
              <Hr className="my-4" />
              <Text className="m-0 text-ink-muted">{message}</Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);
