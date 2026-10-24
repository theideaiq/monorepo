import { BulbKicker } from "@repo/design-system/components/brand/bulb-kicker";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * The bulb kicker, centred above a headline: pink on Paper, yellow in dark
 * mode and on pink grounds.
 */
const meta = {
  component: BulbKicker,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "brand/BulbKicker",
} satisfies Meta<typeof BulbKicker>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Above a headline. */
export const AboveHeadline: Story = {
  render: (args) => (
    <div className="grid gap-3 text-center">
      <BulbKicker {...args} />
      <h2 className="text-h2">Your order is in</h2>
    </div>
  ),
};

/** 20, 24 and 28px. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6">
      <BulbKicker size="sm" />
      <BulbKicker size="md" />
      <BulbKicker size="lg" />
    </div>
  ),
};

/** On a yellow ground the bulb is pink. */
export const OnYellow: Story = {
  render: () => (
    <div className="rounded-lg bg-bulb-yellow p-6">
      <BulbKicker className="text-idea-pink dark:text-idea-pink" />
    </div>
  ),
};
