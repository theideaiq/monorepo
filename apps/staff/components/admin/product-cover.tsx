import { cn } from "@repo/design-system/lib/utils";
import { ImageOffIcon } from "lucide-react";
import Image from "next/image";
import {
  catalogImageUrl,
  isRemoteCatalogImage,
} from "@/lib/admin/catalog-images";

/**
 * A product's cover as a small square: remote cover art through next/image
 * (the CSP only allows images from this origin), storage paths straight
 * from the public bucket, and a placeholder when there is no picture.
 */
export const ProductCover = ({
  className,
  image,
  size = 48,
  supabaseUrl,
}: {
  readonly className?: string;
  readonly image: string | null | undefined;
  readonly size?: number;
  readonly supabaseUrl: string;
}) => {
  const classes = cn("shrink-0 rounded object-cover", className);
  if (!image) {
    return (
      <span
        className={cn(classes, "flex items-center justify-center bg-muted")}
        style={{ height: size, width: size }}
      >
        <ImageOffIcon
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
      </span>
    );
  }
  if (isRemoteCatalogImage(image)) {
    return (
      <Image
        alt=""
        className={classes}
        height={size}
        src={image}
        style={{ height: size, width: size }}
        width={size}
      />
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: a public catalog image
    <img
      alt=""
      className={classes}
      height={size}
      src={catalogImageUrl(supabaseUrl, image)}
      style={{ height: size, width: size }}
      width={size}
    />
  );
};
