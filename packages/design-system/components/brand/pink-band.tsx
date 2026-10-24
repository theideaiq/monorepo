import type { ReactNode } from "react";
import { cn } from "../../lib/utils";
import { BulbKicker } from "./bulb-kicker";

interface PinkBandProps {
  /** The call to action, usually `<Button variant="brand">`. */
  readonly action?: ReactNode;
  readonly className?: string;
  readonly description?: ReactNode;
  /** The headline; wrap one phrase in `<Highlight>` (it turns yellow here). */
  readonly title: ReactNode;
  /** Heading level of the title (h2 by default). */
  readonly titleAs?: "h1" | "h2" | "h3";
}

/**
 * The Pink Band: one full-width pink band per page with a yellow bulb
 * kicker, a white headline with one yellow Highlight and a yellow `brand`
 * button. The page's main call to action.
 */
export const PinkBand = ({
  action,
  className,
  description,
  title,
  titleAs: Title = "h2",
}: PinkBandProps) => (
  <section
    className={cn(
      "group/ground w-full bg-idea-pink px-4 py-16 text-on-pink md:py-24",
      className
    )}
    data-ground="pink"
    data-slot="pink-band"
  >
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
      <BulbKicker size="lg" />
      <Title className="text-balance text-h1 md:text-display">{title}</Title>
      {description ? (
        <p className="max-w-2xl text-balance text-body-lg">{description}</p>
      ) : null}
      {action ? (
        <div className="flex flex-wrap justify-center gap-3">{action}</div>
      ) : null}
    </div>
  </section>
);
