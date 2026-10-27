import { BrandLogo } from "@repo/design-system/components/brand-logo";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * The IDEA lock-up: the bulb and the wordmark, in pink, yellow and white
 * only (never black). `auto` follows the theme; switch Theme and Direction
 * in the toolbar to check Paper, Dark, Arabic and English.
 */
const meta = {
  args: { variant: "auto" },
  argTypes: {
    line: {
      control: "select",
      options: [
        undefined,
        "Club",
        "Design",
        "Droid",
        "Partners",
        "Pass",
        "Plus",
        "Staff",
        "Store",
      ],
    },
    variant: {
      control: "inline-radio",
      options: ["auto", "on-light", "on-pink", "on-yellow", "on-dark"],
    },
  },
  component: BrandLogo,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "brand/BrandLogo",
} satisfies Meta<typeof BrandLogo>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Follows the theme: pink on Paper, yellow bulb and white in dark mode. */
export const Auto: Story = { args: { className: "text-2xl" } };

/** A line lock-up: the line word in weight 600 after The IDEA. */
export const LineLockup: Story = {
  args: { className: "text-2xl", line: "Partners" },
};

/** Each ground with its colours. */
export const Grounds: Story = {
  render: () => (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg bg-surface p-6 ring-1 ring-border">
        <BrandLogo className="text-2xl" variant="on-light" />
      </div>
      <div className="rounded-lg bg-idea-pink p-6">
        <BrandLogo className="text-2xl" variant="on-pink" />
      </div>
      <div className="rounded-lg bg-bulb-yellow p-6">
        <BrandLogo className="text-2xl" variant="on-yellow" />
      </div>
      <div className="dark rounded-lg bg-surface p-6">
        <BrandLogo className="text-2xl" variant="on-dark" />
      </div>
    </div>
  ),
};
