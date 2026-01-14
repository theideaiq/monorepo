import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface BrandedTemplateProps {
  subject: string;
  bodyHtml: string;
}

export const BrandedTemplate = ({
  subject,
  bodyHtml,
}: BrandedTemplateProps) => {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://placehold.co/200x50?text=The+IDEA"
              width="200"
              height="50"
              alt="The IDEA"
              style={logo}
            />
          </Section>
          <Section style={content}>
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Email content needs HTML */}
            <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              The IDEA Admin Platform
              <br />
              123 Innovation Drive
              <br />
              <Link href="#" style={link}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px',
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '0 32px',
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  padding: '0 32px',
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};

const link = {
  color: '#8898aa',
  textDecoration: 'underline',
};
