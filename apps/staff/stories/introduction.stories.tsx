import { NameTile } from "@repo/design-system/components/brand/name-tile";
import type { Meta, StoryObj } from "@storybook/react";
import { ArrowRight, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The brand basics every screen and email builds on: The IDEA brand v1.0
 * (docs/brand), its tokens and fonts in packages/design-system
 * (styles/globals.css, lib/fonts.ts) and the Arabic/English rules in
 * AGENTS.md.
 */
const meta = {
  parameters: { layout: "fullscreen" },
  title: "The IDEA Design/Introduction",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

interface Swatch {
  label: string;
  token: string;
  usage: string;
}

const BRAND: Swatch[] = [
  {
    label: "The IDEA Pink",
    token: "--idea-pink",
    usage:
      "Primary buttons, the Pink Band, avatars, the app icon (#D81B60); Pink Deep (#B5134E) on hover. Text on it is white.",
  },
  {
    label: "Bulb Yellow",
    token: "--bulb-yellow",
    usage:
      "The bulb, Highlights and buttons on pink (#F4CF08). Text on it is ink; never text on Paper.",
  },
  {
    label: "Paper",
    token: "--surface",
    usage: "The page ground (#FBF8EF; #121318 in dark mode).",
  },
  {
    label: "Pink text",
    token: "--pink-text",
    usage:
      "Pink as text: links, the wordmark on Paper, prices (#F06292 in dark).",
  },
  {
    label: "Ink",
    token: "--ink",
    usage: "Body and heading text only; never in logos, tiles or brand blocks.",
  },
];

const ROLES: Swatch[] = [
  { label: "Background", token: "--background", usage: "Page" },
  { label: "Foreground", token: "--foreground", usage: "Body text" },
  { label: "Card", token: "--card", usage: "Cards and popovers" },
  { label: "Muted", token: "--muted", usage: "Quiet surfaces" },
  {
    label: "Muted foreground",
    token: "--muted-foreground",
    usage: "Secondary text",
  },
  { label: "Border", token: "--border", usage: "Rules and inputs" },
  { label: "Success", token: "--success", usage: "Confirmations" },
  { label: "Destructive", token: "--destructive", usage: "Errors, deletes" },
];

const CHARTS = [
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
];

/** Physical utility → logical utility, as `bun run check:rtl --fix` rewrites them. */
const LOGICAL: [string, string][] = [
  ["ml-4 / mr-4", "ms-4 / me-4"], // rtl-ignore
  ["pl-2 / pr-2", "ps-2 / pe-2"], // rtl-ignore
  ["left-0 / right-0", "start-0 / end-0"], // rtl-ignore
  ["text-left / text-right", "text-start / text-end"], // rtl-ignore
  ["border-l / rounded-r", "border-s / rounded-e"], // rtl-ignore
];

const Section = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => (
  <section className="grid gap-4">
    <h2 className="font-semibold text-xl">{title}</h2>
    {children}
  </section>
);

const SwatchCard = ({ label, token, usage }: Swatch) => (
  <div className="grid gap-2 rounded-md border bg-card p-3 text-card-foreground">
    <div
      className="h-16 rounded-md border"
      style={{ background: `var(${token})` }}
    />
    <div className="font-medium text-sm">{label}</div>
    <code className="font-mono text-muted-foreground text-xs">{token}</code>
    <p className="text-muted-foreground text-xs">{usage}</p>
  </div>
);

const Introduction = () => (
  <main className="mx-auto grid max-w-5xl gap-10 p-6 md:p-10">
    <header className="grid gap-3">
      <div className="flex items-center gap-3">
        <NameTile shape="square" size={32} />
        <h1 className="font-bold text-3xl tracking-tight">The IDEA Design</h1>
      </div>
      <p className="max-w-3xl text-muted-foreground">
        One place for staff to review The IDEA's interface and email: the shared
        components from @repo/design-system and every template in @repo/email,
        each in Arabic and English. Use the toolbar to switch the theme (light,
        dark) and the direction (LTR, RTL).
      </p>
    </header>

    <Section title="Naming">
      <ul className="grid list-disc gap-1 ps-6 text-sm">
        <li>
          The brand is always "The IDEA", never a bare "IDEA": The IDEA Pass,
          The IDEA Plus, The IDEA Design.
        </li>
        <li>
          Arabic copy is real Arabic, written in
          packages/internationalization/messages/ar.json; Latin product names
          stay in Latin script.
        </li>
      </ul>
    </Section>

    <Section title="Brand colors">
      <div className="grid gap-4 sm:grid-cols-3">
        {BRAND.map((swatch) => (
          <SwatchCard key={swatch.token} {...swatch} />
        ))}
      </div>
    </Section>

    <Section title="Role tokens">
      <p className="text-muted-foreground text-sm">
        Components use the role tokens (Tailwind bg-background, text-foreground,
        bg-primary, border, …), never raw hex values, so both themes work. The
        swatches follow the theme picked in the toolbar.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {ROLES.map((swatch) => (
          <SwatchCard key={swatch.token} {...swatch} />
        ))}
      </div>
      <div className="flex gap-2">
        {CHARTS.map((token) => (
          <div className="grid flex-1 gap-1" key={token}>
            <div
              className="h-8 rounded-md"
              style={{ background: `var(${token})` }}
            />
            <code className="font-mono text-muted-foreground text-xs">
              {token}
            </code>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Corners: rounded-sm 6px, rounded-md 10px (controls), rounded-lg 16px
        (cards), rounded-xl 28px (hero panels and plan cards), rounded-full for
        chips and tiles.
      </p>
    </Section>

    <Section title="Type">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 rounded-md border p-4" lang="en">
          <code className="font-mono text-muted-foreground text-xs">
            Alexandria · --font-alexandria
          </code>
          <p className="text-h2">Games, books and more</p>
          <p className="text-small">
            One family for Latin and Arabic. Weights 400 (body), 500 (prices),
            600 (headings and labels), 700 (titles). The wordmark is live text
            in 700.
          </p>
        </div>
        <div className="grid gap-2 rounded-md border p-4" dir="rtl" lang="ar">
          <code className="font-mono text-muted-foreground text-xs" dir="ltr">
            Alexandria
          </code>
          <p className="text-h2">ألعاب وكتب والمزيد</p>
          <p className="text-body-ar">
            خط Alexandria للعربية والإنجليزية معاً، وفيه گ وچ وپ وژ.
          </p>
        </div>
      </div>
    </Section>

    <Section title="Arabic and English (RTL and LTR)">
      <ul className="grid list-disc gap-1 ps-6 text-sm">
        <li>
          Arabic is the default language. Every screen works right-to-left and
          left-to-right; check both with the Direction toolbar.
        </li>
        <li>
          Use logical Tailwind utilities, never physical ones;{" "}
          <code className="font-mono">bun run check:rtl</code> enforces it.
        </li>
        <li>
          Icons that point along the reading direction (arrows, chevrons) get{" "}
          <code className="font-mono">rtl:rotate-180</code>:{" "}
          <ArrowRight
            aria-label="Next"
            className="inline size-4 rtl:rotate-180"
          />{" "}
          <ChevronRight
            aria-label="More"
            className="inline size-4 rtl:rotate-180"
          />
        </li>
        <li>
          Numbers and dates use Latin digits and Asia/Baghdad time: format them
          with @repo/internationalization/format before they go into a message
          (ICU # would print Arabic-Indic digits).
        </li>
        <li>
          Every UI string comes from the messages files (
          <code className="font-mono">bun run check:i18n</code>); links keep
          their /ar or /en prefix.
        </li>
      </ul>
      <table className="w-full max-w-xl border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-start font-medium">Physical (never)</th>
            <th className="py-2 text-start font-medium">Logical (always)</th>
          </tr>
        </thead>
        <tbody>
          {LOGICAL.map(([physical, logical]) => (
            <tr className="border-b" key={physical}>
              <td className="py-2 font-mono text-muted-foreground">
                {physical}
              </td>
              <td className="py-2 font-mono">{logical}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>

    <Section title="Email">
      <p className="text-sm">
        Emails can't use the CSS variables, so packages/email repeats the brand
        values inline: the pink header with the lock-up on pink, pink links
        (#d81b60), Alexandria with system fallbacks, and dir="rtl" with
        right-aligned text in Arabic. Review every template under Emails.
      </p>
    </Section>
  </main>
);

export const Overview: Story = {
  render: () => <Introduction />,
};
