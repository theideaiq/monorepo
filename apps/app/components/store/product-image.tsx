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

/** A square catalog image, or a placeholder when the product has none. */
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
        "relative aspect-square overflow-hidden rounded-lg bg-muted",
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
          unoptimized
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
