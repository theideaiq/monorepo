import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Button } from "@repo/design-system/components/ui/button";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * The Pink Band: the page's main call to action, once per page. A yellow
 * bulb kicker, a white headline with one yellow Highlight and a yellow
 * `brand` button. Switch Direction to check Arabic.
 */
const meta = {
  args: {
    action: <Button variant="brand">Join in the app</Button>,
    description: "Rent PS5 games, books and movies every month.",
    title: (
      <>
        Play it. Read it. <Highlight>Swap it.</Highlight>
      </>
    ),
  },
  component: PinkBand,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "brand/PinkBand",
} satisfies Meta<typeof PinkBand>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Arabic copy, as on the Arabic home page. */
export const Arabic: Story = {
  args: {
    action: <Button variant="brand">انضم من التطبيق</Button>,
    description: "استأجر ألعاب PS5 والكتب والأفلام كل شهر.",
    title: (
      <>
        العب. اقرأ. <Highlight>بدّل.</Highlight>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div dir="rtl" lang="ar">
        <Story />
      </div>
    ),
  ],
};
