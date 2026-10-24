import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * The Highlight: a yellow swipe with dark text on Paper and Dark; inside a
 * pink ground the words turn yellow with no swipe. One per headline.
 */
const meta = {
  args: { children: "every aspect of life." },
  component: Highlight,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "brand/Highlight",
} satisfies Meta<typeof Highlight>;

export default meta;

type Story = StoryObj<typeof meta>;

/** In a headline on the page surface. */
export const InHeadline: Story = {
  render: (args) => (
    <h2 className="max-w-xl text-balance text-center text-h1">
      Innovation for <Highlight {...args} />
    </h2>
  ),
};

/** On pink: the words turn yellow. */
export const OnPink: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <PinkBand
      title={
        <>
          One membership.{" "}
          <Highlight {...args}>Endless entertainment.</Highlight>
        </>
      }
    />
  ),
};
