import { ConditionBulb } from "@repo/design-system/components/brand/condition-bulb";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Condition bulbs, always with the word: full yellow for new, unlit for
 * like new, half lit for used. Letter grades stay in the back office.
 */
const meta = {
  args: { condition: "new", label: "New" },
  argTypes: {
    condition: {
      control: "inline-radio",
      options: ["new", "like-new", "used"],
    },
  },
  component: ConditionBulb,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "brand/ConditionBulb",
} satisfies Meta<typeof ConditionBulb>;

export default meta;

type Story = StoryObj<typeof meta>;

export const New: Story = {};

/** All three, in English and Arabic. */
export const All: Story = {
  render: () => (
    <div className="grid gap-4">
      <div className="flex gap-6" lang="en">
        <ConditionBulb condition="new" label="New" />
        <ConditionBulb condition="like-new" label="Like new" />
        <ConditionBulb condition="used" label="Used" />
      </div>
      <div className="flex gap-6" dir="rtl" lang="ar">
        <ConditionBulb condition="new" label="جديد" />
        <ConditionBulb condition="like-new" label="اخو الجديد" />
        <ConditionBulb condition="used" label="مستعمل" />
      </div>
    </div>
  ),
};
