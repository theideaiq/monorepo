import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { SouqPrice } from "@repo/design-system/components/brand/souq-price";
import type { Meta, StoryObj } from "@storybook/react";

const now = new Date("2026-10-24T12:00:00Z");
const english = { currency: "IQD", market: "In the market", withUs: "With us" };
const arabic = {
  currency: "دينار عراقي",
  market: "بالسوگ بـ",
  withUs: "يمنا بـ",
};

/**
 * The souq price: the market price small and struck, then ours large and
 * bold. The market line renders only with a market price checked in the
 * last 7 days.
 */
const meta = {
  args: {
    checkedAt: "2026-10-21T09:00:00Z",
    labels: english,
    marketPrice: "150,000",
    now,
    price: "99,750",
  },
  component: SouqPrice,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "brand/SouqPrice",
} satisfies Meta<typeof SouqPrice>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Checked: Story = {};

export const Arabic: Story = {
  args: { labels: arabic },
  decorators: [
    (Story) => (
      <div dir="rtl" lang="ar">
        <Story />
      </div>
    ),
  ],
};

/** Checked more than 7 days ago: only our price shows. */
export const Stale: Story = { args: { checkedAt: "2026-10-10T09:00:00Z" } };

/** Large on pink: our number turns yellow (24px and up). */
export const OnPink: Story = {
  args: { size: "lg" },
  parameters: { layout: "fullscreen" },
  render: (args) => <PinkBand title={<SouqPrice {...args} />} titleAs="h3" />,
};
