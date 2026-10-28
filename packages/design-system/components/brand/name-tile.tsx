import { cn } from "../../lib/utils";
import { Bulb } from "./bulb";

interface NameTileProps {
  readonly className?: string;
  readonly shape?: "circle" | "square";
  /** Width and height in pixels, 32–128. */
  readonly size?: number;
  /** `public`: white on pink. `internal` (The IDEA Staff): pink on yellow. */
  readonly tone?: "internal" | "public";
  /** One bold word ("Club", "Post"); without one the tile shows the bulb. */
  readonly word?: string;
}

/**
 * A name tile, the avatar language of The IDEA's Telegram community: one
 * Alexandria 700 word across about 70% of a circle (or a square with 22%
 * corners). Without a word: the yellow bulb on pink.
 */
export const NameTile = ({
  className,
  shape = "circle",
  size = 64,
  tone = "public",
  word,
}: NameTileProps) => {
  const px = Math.min(128, Math.max(32, size));
  const internal = tone === "internal" && word;

  const classes = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden font-bold leading-none tracking-[-0.01em]",
    shape === "circle" ? "rounded-full" : "rounded-[22%]",
    internal ? "bg-bulb-yellow text-idea-pink" : "bg-idea-pink text-on-pink",
    className
  );

  if (!word) {
    return (
      <span
        aria-hidden="true"
        className={classes}
        data-slot="name-tile"
        style={{ height: px, width: px }}
      >
        <Bulb className="size-[56%] text-bulb-yellow" />
      </span>
    );
  }

  return (
    <span
      aria-label={word}
      className={classes}
      data-slot="name-tile"
      role="img"
      style={{
        fontSize: (px * 0.7) / Math.max(word.length * 0.58, 1),
        height: px,
        width: px,
      }}
    >
      <span aria-hidden="true" dir="auto">
        {word}
      </span>
    </span>
  );
};
