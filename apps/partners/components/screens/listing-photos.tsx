"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { checkFile } from "@repo/storage";
import { ImagePlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type ChangeEvent,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";
import { MAX_LISTING_PHOTOS, pictureUrl } from "@/lib/listing-queries";

/** A numbered step of List an item: Find it, Photos, Condition and price. */
export const Step = ({
  children,
  number,
  title,
}: {
  readonly children: ReactNode;
  readonly number: number;
  readonly title: string;
}) => (
  <section className="grid gap-3">
    <h3 className="flex items-center gap-2 font-medium text-sm">
      <span
        aria-hidden="true"
        className="flex size-6 items-center justify-center rounded-full bg-surface-sunken font-mono text-xs"
      >
        {number}
      </span>
      {title}
    </h3>
    {children}
  </section>
);

const Preview = ({
  file,
  label,
  onRemove,
  removeLabel,
}: {
  readonly file: File;
  readonly label: string;
  readonly onRemove: () => void;
  readonly removeLabel: string;
}) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return (
    <li className="relative size-24 overflow-hidden rounded-lg border bg-surface-sunken">
      {url ? (
        // biome-ignore lint/performance/noImgElement: a local preview (blob URL), not a remote image
        <img
          alt={label}
          className="size-full object-cover"
          height={96}
          src={url}
          width={96}
        />
      ) : null}
      <Button
        aria-label={removeLabel}
        className="absolute end-1 top-1 size-7"
        onClick={onRemove}
        size="icon"
        type="button"
        variant="secondary"
      >
        <XIcon aria-hidden="true" />
      </Button>
    </li>
  );
};

/**
 * The shop's photos of the item: at least one (the Store shows no product
 * without a picture), up to 10, JPG, PNG or WebP.
 */
export const PhotoPicker = ({
  onChange,
  photos,
}: {
  readonly onChange: (photos: File[]) => void;
  readonly photos: readonly File[];
}) => {
  const t = useTranslations("app.company.listings.photos");
  const id = useId();
  const [refused, setRefused] = useState(false);
  const full = photos.length >= MAX_LISTING_PHOTOS;

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    const fine = picked.filter((file) => !checkFile("auctionPhotos", file));
    setRefused(fine.length < picked.length);
    onChange([...photos, ...fine].slice(0, MAX_LISTING_PHOTOS));
  };

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm" id={`${id}-hint`}>
        {t("hint")}
      </p>
      {photos.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {photos.map((file, index) => (
            <Preview
              file={file}
              key={`${file.name}-${file.size}-${file.lastModified}`}
              label={t("photo", { number: String(index + 1) })}
              onRemove={() =>
                onChange(photos.filter((_, other) => other !== index))
              }
              removeLabel={t("remove", { number: String(index + 1) })}
            />
          ))}
        </ul>
      ) : null}
      <div>
        <input
          accept="image/png,image/jpeg,image/webp"
          aria-describedby={`${id}-hint`}
          className="sr-only"
          disabled={full}
          id={`${id}-file`}
          multiple
          onChange={pick}
          type="file"
        />
        <Button asChild disabled={full} type="button" variant="outline">
          <label className="cursor-pointer" htmlFor={`${id}-file`}>
            <ImagePlusIcon aria-hidden="true" />
            {photos.length > 0 ? t("addMore") : t("add")}
          </label>
        </Button>
      </div>
      {refused ? (
        <p className="text-destructive text-sm" role="alert">
          {t("refused")}
        </p>
      ) : null}
    </div>
  );
};

/** The pictures a product already has (buyers see these). */
export const ProductPictures = ({
  images,
  name,
}: {
  readonly images: readonly string[];
  readonly name: string;
}) => {
  const t = useTranslations("app.company.listings.photos");
  const { supabase } = useAuth();
  if (images.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("none")}</p>;
  }
  return (
    <div className="grid gap-2">
      <ul className="flex flex-wrap gap-2">
        {images.slice(0, 4).map((path, index) => (
          <li
            className="size-24 overflow-hidden rounded-lg border bg-surface-sunken"
            key={path}
          >
            {/* biome-ignore lint/performance/noImgElement: catalog pictures of any size, shown small */}
            <img
              alt={t("productPhoto", { name, number: String(index + 1) })}
              className="size-full object-cover"
              height={96}
              src={pictureUrl(supabase, path)}
              width={96}
            />
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">{t("productHint")}</p>
    </div>
  );
};
