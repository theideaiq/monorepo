import { Badge } from "@repo/design-system/components/ui/badge";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Displays a badge or a component that looks like a badge.
 */
const meta = {
  args: {
    children: "Badge",
  },
  argTypes: {
    children: {
      control: "text",
    },
  },
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  title: "ui/Badge",
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The default form of the badge.
 */
export const Default: Story = {};

/**
 * Use the `secondary` badge to call for less urgent information, blending
 * into the interface while still signaling minor updates or statuses.
 */
export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

/**
 * Use the `destructive` badge to  indicate errors, alerts, or the need for
 * immediate attention.
 */
export const Destructive: Story = {
  args: {
    variant: "destructive",
  },
};

/**
 * Use the `outline` badge for overlaying without obscuring interface details,
 * emphasizing clarity and subtlety..
 */
export const Outline: Story = {
  args: {
    variant: "outline",
  },
};

const tones = [
  "neutral",
  "brand",
  "highlight",
  "plus",
  "business",
  "club",
  "success",
  "warning",
  "danger",
] as const;

/**
 * Every tone. Product accents (plus, business, club) only
 * on their own line's pages; status tones always carry an icon and a word.
 */
export const Tones: Story = {
  render: () => (
    <div className="flex max-w-md flex-wrap gap-2">
      {tones.map((tone) => (
        <Badge key={tone} variant={tone}>
          {tone}
        </Badge>
      ))}
    </div>
  ),
};
