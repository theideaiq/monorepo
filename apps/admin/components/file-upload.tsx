"use client";

import { createClient } from "@repo/auth/client";
import { Button } from "@repo/design-system/components/ui/button";
import { Label } from "@repo/design-system/components/ui/label";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { cn } from "@repo/design-system/lib/utils";
import {
  buckets,
  checkFile,
  fileNameOf,
  publicFileUrl,
  uploadPublicFile,
} from "@repo/storage";
import { FileTextIcon, StarIcon, UploadIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ChangeEvent, useId, useMemo, useRef, useState } from "react";
import { useFormContext } from "./action-form";

interface FileUploadProps {
  readonly accept: "image" | "pdf";
  readonly bucket: "catalog" | "editorial";
  readonly defaultPaths?: string[];
  /** Folder inside the bucket, e.g. "products" or "posts". */
  readonly folder: string;
  readonly hint?: string;
  readonly label: string;
  /** Up to this many files; more than one submits `name[]`. */
  readonly max?: number;
  readonly name: string;
  readonly supabaseUrl: string;
}

const ACCEPT = {
  image: "image/png,image/jpeg,image/webp",
  pdf: "application/pdf",
};

/**
 * Uploads straight from the browser to a public bucket with the staff
 * member's session (the bucket policies check the role), then submits only
 * the storage paths with the form. The first image is the cover.
 */
export const FileUpload = ({
  accept,
  bucket,
  defaultPaths = [],
  folder,
  hint,
  label,
  max = 1,
  name,
  supabaseUrl,
}: FileUploadProps) => {
  const t = useTranslations("admin.upload");
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const { invalid } = useFormContext();
  const [paths, setPaths] = useState(defaultPaths);
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const multiple = max > 1;

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(
      0,
      multiple ? max - paths.length : 1
    );
    event.target.value = "";
    if (files.length === 0) {
      return;
    }
    setProblem(null);

    for (const file of files) {
      const issue = checkFile(bucket, file);
      if (issue) {
        setProblem(t(`problems.${issue}`, { name: file.name }));
        return;
      }
    }

    setUploading(true);
    try {
      const stored = await Promise.all(
        files.map((file) => uploadPublicFile(supabase, bucket, folder, file))
      );
      const added = stored.map((file) => file.path);
      setPaths((current) => (multiple ? [...current, ...added] : added));
    } catch {
      setProblem(t("problems.failed"));
    } finally {
      setUploading(false);
    }
  };

  const remove = (path: string) =>
    setPaths((current) => current.filter((item) => item !== path));

  const makeFirst = (path: string) =>
    setPaths((current) => [path, ...current.filter((item) => item !== path)]);

  const canAdd = multiple ? paths.length < max : true;
  const maxMegabytes = Math.round(buckets[bucket].maxBytes / 1024 / 1024);

  return (
    <div className="grid gap-2">
      <Label
        className={cn(invalid(name) && "text-destructive")}
        htmlFor={id}
      >
        {label}
      </Label>

      {paths.map((path) => (
        <input
          key={path}
          name={multiple ? `${name}[]` : name}
          type="hidden"
          value={path}
        />
      ))}
      {multiple && paths.length === 0 ? (
        // An empty list still clears the field on save.
        <input name={`${name}[]`} type="hidden" value="" />
      ) : null}
      {multiple ? null : paths.length === 0 ? (
        <input name={name} type="hidden" value="" />
      ) : null}

      {paths.length > 0 ? (
        <ul
          className={cn(
            "grid gap-2",
            accept === "image" && "grid-cols-2 sm:grid-cols-4"
          )}
        >
          {paths.map((path, index) => (
            <li
              className="relative flex items-center gap-2 overflow-hidden rounded-md border bg-muted/40"
              key={path}
            >
              {accept === "image" ? (
                // biome-ignore lint/performance/noImgElement: previews of just-uploaded files
                <img
                  alt=""
                  className="aspect-square w-full object-cover"
                  src={publicFileUrl(supabaseUrl, bucket, path)}
                />
              ) : (
                <a
                  className="flex min-w-0 flex-1 items-center gap-2 p-2 text-sm underline-offset-4 hover:underline"
                  href={publicFileUrl(supabaseUrl, bucket, path)}
                  rel="noopener"
                  target="_blank"
                >
                  <FileTextIcon className="size-4 shrink-0" />
                  <span className="truncate" dir="auto">
                    {fileNameOf(path)}
                  </span>
                </a>
              )}
              <span className="absolute end-1 top-1 flex gap-1">
                {multiple && accept === "image" && index > 0 ? (
                  <Button
                    aria-label={t("makeCover")}
                    className="size-7"
                    onClick={() => makeFirst(path)}
                    size="icon"
                    title={t("makeCover")}
                    type="button"
                    variant="secondary"
                  >
                    <StarIcon />
                  </Button>
                ) : null}
                <Button
                  aria-label={t("remove")}
                  className="size-7"
                  onClick={() => remove(path)}
                  size="icon"
                  title={t("remove")}
                  type="button"
                  variant="secondary"
                >
                  <XIcon />
                </Button>
              </span>
              {multiple && accept === "image" && index === 0 ? (
                <span className="absolute start-1 bottom-1 rounded bg-brand px-1.5 py-0.5 font-medium text-[10px] text-brand-foreground">
                  {t("cover")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canAdd ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            accept={ACCEPT[accept]}
            className="sr-only"
            id={id}
            multiple={multiple}
            onChange={upload}
            ref={input}
            type="file"
          />
          <Button
            disabled={uploading}
            onClick={() => input.current?.click()}
            size="sm"
            type="button"
            variant="outline"
          >
            {uploading ? <Spinner /> : <UploadIcon />}
            {uploading
              ? t("uploading")
              : paths.length > 0 && !multiple
                ? t("replace")
                : t("choose")}
          </Button>
          <span className="text-muted-foreground text-xs">
            {hint ??
              t(accept === "image" ? "imageHint" : "pdfHint", {
                size: String(maxMegabytes),
              })}
          </span>
        </div>
      ) : null}

      {problem ? (
        <p className="text-destructive text-sm" role="alert">
          {problem}
        </p>
      ) : null}
    </div>
  );
};
