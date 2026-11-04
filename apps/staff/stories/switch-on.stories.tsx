import { SwitchOn } from "@repo/design-system/components/brand/switch-on";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * The Switch on moment on Home: the bulb waits unlit; one tap lights it
 * and reveals the brand line, remembered in this browser (clear
 * `idea:switched-on` in local storage to see it again).
 */
const meta = {
  args: { hint: "Tap the bulb", label: "Switch on" },
  component: SwitchOn,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "brand/SwitchOn",
} satisfies Meta<typeof SwitchOn>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Above the Home headline. */
export const AboveHeadline: Story = {
  args: {
    children: (
      <p className="font-semibold text-pink-text text-sm">Switch on.</p>
    ),
  },
  render: (args) => (
    <div className="grid gap-2 text-center">
      <SwitchOn {...args} />
      <h2 className="text-h2">One Pass.</h2>
    </div>
  ),
};

/** In Arabic. */
export const Arabic: Story = {
  args: {
    children: <p className="font-semibold text-pink-text text-sm">اعلگها</p>,
    hint: "دوس على الگلوب",
    label: "اعلگها",
  },
  render: (args) => (
    <div className="grid gap-2 text-center" dir="rtl" lang="ar">
      <SwitchOn {...args} />
      <h2 className="text-h2">پاس واحد.</h2>
    </div>
  ),
};
