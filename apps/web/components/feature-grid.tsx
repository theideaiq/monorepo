import { cn } from "@repo/design-system/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface Feature {
  description: string;
  icon?: LucideIcon;
  title: string;
}

/** Cards with an icon, a title and a short description. */
export const FeatureGrid = ({
  className,
  items,
}: {
  readonly className?: string;
  readonly items: Feature[];
}) => (
  <ul className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
    {items.map(({ description, icon: Icon, title }) => (
      <li
        className="flex flex-col gap-3 rounded-lg border bg-card p-5"
        key={title}
      >
        {Icon ? (
          <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-pink-text">
            <Icon aria-hidden="true" className="size-5" />
          </span>
        ) : null}
        <h3 className="font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </li>
    ))}
  </ul>
);
