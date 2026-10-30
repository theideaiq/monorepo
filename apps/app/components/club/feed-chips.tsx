import { cn } from "@repo/design-system/lib/utils";
import { Link } from "@repo/internationalization/navigation";

export interface Chip {
  active: boolean;
  href: string;
  label: string;
}

/** A row of filter chips (Join's kinds, Read's topics). */
export const FeedChips = ({
  chips,
  label,
}: {
  readonly chips: readonly Chip[];
  readonly label: string;
}) => (
  <nav aria-label={label} className="-mx-4 overflow-x-auto px-4">
    <ul className="flex gap-2">
      {chips.map((chip) => (
        <li className="shrink-0" key={chip.href}>
          <Link
            aria-current={chip.active ? "page" : undefined}
            className={cn(
              "inline-flex rounded-full border px-4 py-1.5 font-medium text-sm transition-colors hover:bg-muted",
              chip.active &&
                "border-primary bg-primary text-primary-foreground hover:bg-primary"
            )}
            href={chip.href}
          >
            {chip.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);
