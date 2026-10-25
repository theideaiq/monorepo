import { Bulb } from "@repo/design-system/components/brand/bulb";
import { cn } from "@repo/design-system/lib/utils";
import Image from "next/image";

interface CoverImageProps {
  readonly alt: string;
  readonly className?: string;
  /**
   * "product": the whole picture in a square, on a plain tile, so covers,
   * posters, box art and photos line up whatever their shape. "cover"
   * (editorial): cropped to fill a 4:3 frame.
   */
  readonly fit?: "cover" | "product";
  readonly priority?: boolean;
  readonly sizes?: string;
  readonly src: string | null;
}

/** An image in a fixed-ratio box, with the bulb when missing. */
export const CoverImage = ({
  alt,
  className,
  fit = "cover",
  priority,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  src,
}: CoverImageProps) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-md bg-surface-sunken",
      fit === "product" ? "aspect-square" : "aspect-[4/3]",
      className
    )}
  >
    {src ? (
      <Image
        alt={alt}
        className={fit === "product" ? "object-contain p-3" : "object-cover"}
        fill
        priority={priority}
        sizes={sizes}
        src={src}
      />
    ) : (
      <div className="flex size-full items-center justify-center">
        <Bulb className="size-10 text-idea-pink dark:text-bulb-yellow" />
      </div>
    )}
  </div>
);
