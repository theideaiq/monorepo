import { NameTile } from "@repo/design-system/components/brand/name-tile";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Name tiles: one bold word on a circle (or a 22% square). Public channels
 * are white on pink; The IDEA Staff is pink on yellow; no word is the
 * yellow bulb on pink.
 */
const meta = {
  args: { size: 96, word: "Club" },
  argTypes: {
    shape: { control: "inline-radio", options: ["circle", "square"] },
    size: { control: { max: 128, min: 32, type: "range" } },
    tone: { control: "inline-radio", options: ["public", "internal"] },
  },
  component: NameTile,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "brand/NameTile",
} satisfies Meta<typeof NameTile>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Club: Story = {};

/** The community set. */
export const Community: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <NameTile word="Club" />
      <NameTile word="Post" />
      <NameTile word="Droid" />
      <NameTile word="Plus" />
      <NameTile tone="internal" word="Staff" />
      <NameTile />
      <NameTile shape="square" />
    </div>
  ),
};

/** 32 to 128px. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <NameTile size={32} word="Post" />
      <NameTile size={64} word="Post" />
      <NameTile size={128} word="Post" />
    </div>
  ),
};
