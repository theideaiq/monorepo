"use client";

import { cn } from "@repo/design-system/lib/utils";
import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { catalogImage } from "@/lib/images";

interface ProductImageProps {
  readonly alt: string;
  readonly className?: string;
  readonly path: string | null | undefined;
  readonly priority?: boolean;
  readonly sizes?: string;
}

/** A catalog image, whole, in a square tile; a placeholder when there is none. */
export const ProductImage = ({
  alt,
  className,
  path,
  priority,
  sizes = "(min-width: 1024px) 25vw, 50vw",
}: ProductImageProps) => {
  const t = useTranslations("app.common");
  const src = catalogImage(path);

  return (
    <div
      className={cn(
        "relative aspect-square overflow-hidden rounded-md bg-surface-sunken",
        className
      )}
    >
      {src ? (
        <Image
          alt={alt}
          // The whole picture: covers, posters, box art and photos have
          // different shapes; cropping them made the tiles look random.
          className="object-contain p-2"
          fill
          priority={priority}
          sizes={sizes}
          src={src}
        />
      ) : (
        <div
          aria-label={t("noImage")}
          className="flex size-full items-center justify-center text-muted-foreground"
          role="img"
        >
          <ImageIcon className="size-8 opacity-40" />
        </div>
      )}
    </div>
  );
};
