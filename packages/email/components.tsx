import { Button, Img, Link, Section } from "@react-email/components";
import { project } from "@repo/config";
import type { ReactNode } from "react";
import { brand } from "./brand";

/**
 * The lock-up on pink (docs/brand/logos/lockup-on-pink.svg) as a PNG on the
 * website, since many email clients don't show SVG.
 */
export const lockupOnPinkUrl = `${project.url ?? "https://theideaiq.com"}/brand/lockup-on-pink.png`;

const Logo = ({ alt }: { readonly alt: string }) => (
  <Img
    alt={alt}
    height="41"
    src={lockupOnPinkUrl}
    style={{ display: "inline-block", height: 41, width: 142 }}
    width="142"
  />
);

/** The pink header with the lock-up: yellow bulb and white wordmark. */
export const EmailHeader = ({
  alt = project.name,
  href,
}: {
  /** The logo's alt text (the brand name). */
  readonly alt?: string;
  readonly href?: string;
}) => (
  <Section
    style={{
      backgroundColor: brand.ideaPink,
      padding: "20px 32px",
      textAlign: "center",
    }}
  >
    {href ? (
      <Link href={href}>
        <Logo alt={alt} />
      </Link>
    ) : (
      <Logo alt={alt} />
    )}
  </Section>
);

/** The primary action: The IDEA Pink with white text. */
export const EmailButton = ({
  children,
  href,
}: {
  readonly children: ReactNode;
  readonly href: string;
}) => (
  <Button
    href={href}
    style={{
      backgroundColor: brand.ideaPink,
      borderRadius: 10,
      color: brand.onPink,
      display: "inline-block",
      fontSize: 15,
      fontWeight: 600,
      padding: "12px 24px",
      textDecoration: "none",
    }}
  >
    {children}
  </Button>
);
