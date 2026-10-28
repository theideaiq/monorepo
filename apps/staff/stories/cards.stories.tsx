import { Bulb } from "@repo/design-system/components/brand/bulb";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import type { Meta, StoryObj } from "@storybook/react";
import { Check } from "lucide-react";

/**
 * The ProductCard and PlanCard patterns (apps/web/components and
 * apps/app/components/store), built from the design-system pieces. The
 * real cards load their data on the server, so this story mirrors them.
 */
const meta = {
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  title: "brand/Cards",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const ProductTile = ({ rental }: { rental?: boolean }) => (
  <div className="flex w-64 flex-col gap-3 rounded-lg border bg-card p-3 shadow-1">
    <div className="relative flex aspect-[4/3] items-center justify-center rounded-md bg-surface-sunken">
      <Bulb className="size-10 text-idea-pink dark:text-bulb-yellow" />
      <div className="absolute start-2 top-2 flex gap-1">
        {rental ? (
          <Badge variant="highlight">Plus Extra and above</Badge>
        ) : (
          <Badge>Save 33%</Badge>
        )}
      </div>
    </div>
    <h3 className="line-clamp-2 font-medium">
      {rental ? "Elden Ring (PS5)" : "PlayStation 5 Slim"}
    </h3>
    {rental ? (
      <p className="grid text-sm">
        <span className="font-medium">Rent with The IDEA Plus</span>
        <span className="text-muted-foreground text-xs">Worth 59,750 IQD</span>
      </p>
    ) : (
      <p className="font-bold font-mono text-lg">720,000 IQD</p>
    )}
    <Button className="w-full" variant="default">
      {rental ? "Rent with The IDEA Plus" : "Buy"}
    </Button>
  </div>
);

const PlanTile = ({ featured }: { featured?: boolean }) => (
  <div
    className={
      featured
        ? "relative flex w-72 flex-col gap-6 rounded-xl border-2 border-idea-pink bg-card p-6 shadow-2"
        : "relative flex w-72 flex-col gap-6 rounded-xl border bg-card p-6 shadow-1"
    }
  >
    {featured ? (
      <span className="absolute start-6 -top-3 rounded-full bg-idea-pink px-3 py-1 font-semibold text-on-pink text-xs">
        Recommended
      </span>
    ) : null}
    <div className="grid gap-2">
      <h3 className="text-h3">{featured ? "Plus Extra" : "Plus Essential"}</h3>
      <p className="font-bold font-mono text-3xl">
        {featured ? "IQD 25,000" : "IQD 15,000"}
      </p>
    </div>
    <ul className="grid gap-2 text-sm">
      <li className="flex gap-2">
        <Check aria-hidden="true" className="size-4 text-pink-text" />
        {featured ? "Two games at a time" : "One game at a time"}
      </li>
    </ul>
    <Button
      className="w-full"
      size="lg"
      variant={featured ? "default" : "outline"}
    >
      Choose
    </Button>
  </div>
);

/** A sale item with its price, and a rental with its bulb. */
export const Product: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <ProductTile />
      <ProductTile rental />
    </div>
  ),
};

/** The featured plan: 2px pink border, pink flag, pink button. */
export const Plan: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 pt-4">
      <PlanTile />
      <PlanTile featured />
    </div>
  ),
};
