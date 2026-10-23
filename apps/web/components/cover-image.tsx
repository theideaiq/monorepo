import { cn } from "@repo/design-system/lib/utils";
import { Lightbulb } from "lucide-react";
import Image from "next/image";

interface CoverImageProps {
  readonly alt: string;
  readonly className?: string;
  readonly priority?: boolean;
  readonly sizes?: string;
  readonly src: string | null;
}

/** A cropped image in a fixed-ratio box, with the brand mark when missing. */
export const CoverImage = ({
  alt,
  className,
  priority,
  sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw",
  src,
}: CoverImageProps) => (
  <div
    className={cn(
      "relative aspect-[4/3] overflow-hidden rounded-lg bg-muted",
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
      <div className="flex size-full items-center justify-center bg-gradient-to-br from-brand/20 to-primary/10">
        <Lightbulb aria-hidden="true" className="size-10 text-brand" />
      </div>
    )}
  </div>
);
