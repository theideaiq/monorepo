import { Bulb } from "@repo/design-system/components/brand/bulb";
import { cn } from "@repo/design-system/lib/utils";
import Image from "next/image";

interface CoverImageProps {
  readonly alt: string;
  readonly className?: string;
  readonly priority?: boolean;
  readonly sizes?: string;
  readonly src: string | null;
}

/** A cropped image in a fixed-ratio box, with the bulb when missing. */
export const CoverImage = ({
  alt,
  className,
  priority,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  src,
}: CoverImageProps) => (
  <div
    className={cn(
      "relative aspect-[4/3] overflow-hidden rounded-md bg-surface-sunken",
      className
    )}
  >
    {src ? (
      <Image
        alt={alt}
        className="object-cover"
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
