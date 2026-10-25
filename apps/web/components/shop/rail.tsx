import { Link } from "@repo/internationalization/navigation";
import { MoveRight } from "lucide-react";
import { Children, type ReactNode } from "react";

interface RailProps {
  readonly action?: { href: string; label: string };
  /** One keyed element per card. */
  readonly children: ReactNode;
  readonly title: string;
}

/**
 * A titled row of cards that swipes sideways on phones and becomes a grid
 * on wider screens.
 */
export const Rail = ({ action, children, title }: RailProps) => (
  <section className="container mx-auto flex flex-col gap-4 px-4 py-6">
    <div className="flex items-end justify-between gap-4">
      <h2 className="font-bold text-xl tracking-tight md:text-2xl">{title}</h2>
      {action ? (
        <Link
          className="inline-flex shrink-0 items-center gap-1 font-medium text-pink-text text-sm hover:underline"
          href={action.href}
        >
          {action.label}
          <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      ) : null}
    </div>
    <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4">
      {Children.map(children, (child) => (
        <li className="flex w-[44%] shrink-0 snap-start sm:w-[30%] md:w-auto">
          {child}
        </li>
      ))}
    </ul>
  </section>
);
