"use client";

import { createClient } from "@repo/auth/client";
import type { Json } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { cn } from "@repo/design-system/lib/utils";
import { ImageIcon, SearchIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Panel } from "@/components/admin/page";
import { MAX_IMAGES } from "@/lib/admin/catalog-import";
import {
  type CoverCandidate,
  coverQuery,
  coverStrategy,
  findCovers,
} from "@/lib/admin/covers";
import { useRouter } from "@/lib/admin/navigation";

interface CandidatePictureProps {
  readonly candidate: CoverCandidate;
  readonly className?: string;
  readonly index: number;
  /** The cover couldn't be loaded (e.g. the Cover Art Archive has none). */
  readonly onBroken: () => void;
  readonly size: number;
}

/** A candidate cover, optimised by Next.js (the CSP allows only this origin). */
export const CandidatePicture = ({
  candidate,
  className,
  index,
  onBroken,
  size,
}: CandidatePictureProps) => {
  const t = useTranslations("admin.catalog.covers");
  return (
    <Image
      alt={t("candidate", {
        index: String(index + 1),
        source: t(`source.${candidate.source}`),
      })}
      className={cn("aspect-square rounded-md border object-cover", className)}
      height={size}
      onError={onBroken}
      src={candidate.url}
      width={size}
    />
  );
};

/** Images to save: the chosen cover first, then the others (at most 12). */
export const withCover = (images: readonly string[], url: string) =>
  [url, ...images.filter((image) => image !== url)].slice(0, MAX_IMAGES);

interface CoverFinderProps {
  readonly categorySlug: string | null;
  readonly product: {
    details: Json;
    id: string;
    images: string[];
    name_en: string;
  };
}

type Lookup =
  | { state: "idle" }
  | { state: "searching" }
  | { state: "failed" }
  | { candidates: CoverCandidate[]; state: "done" };

/**
 * "Find picture" on the product page: looks the product up by category
 * (MusicBrainz + Cover Art Archive, Open Library or Wikipedia) and saves the
 * candidate the staff member picks as the cover, through their own session.
 */
export const CoverFinder = ({ categorySlug, product }: CoverFinderProps) => {
  const t = useTranslations("admin.catalog.covers");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const query = coverQuery(product, coverStrategy(categorySlug));
  const queryText = [query.creator, query.title].filter(Boolean).join(" – ");

  const search = async () => {
    setLookup({ state: "searching" });
    setBroken(new Set());
    try {
      setLookup({
        candidates: await findCovers(product, categorySlug),
        state: "done",
      });
    } catch {
      setLookup({ state: "failed" });
    }
  };

  const use = async (url: string) => {
    setSaving(url);
    const { data, error } = await supabase
      .from("products")
      .update({ images: withCover(product.images, url) })
      .eq("id", product.id)
      .select("id");
    setSaving(null);
    if (error || !data?.length) {
      toast.error(t("saveFailed"));
      return;
    }
    toast.success(t("saved"));
    setLookup({ state: "idle" });
    router.refresh();
  };

  const candidates =
    lookup.state === "done"
      ? lookup.candidates.filter((candidate) => !broken.has(candidate.url))
      : [];

  return (
    <Panel
      actions={
        <Button
          disabled={lookup.state === "searching"}
          onClick={search}
          size="sm"
          type="button"
          variant="outline"
        >
          {lookup.state === "searching" ? <Spinner /> : <SearchIcon />}
          {t("find")}
        </Button>
      }
      description={t("panelDescription")}
      title={t("find")}
    >
      {lookup.state === "idle" ? null : (
        <p className="text-muted-foreground text-sm" dir="auto">
          {t("searchedFor", { query: queryText })}
        </p>
      )}
      {lookup.state === "searching" ? (
        <p className="text-muted-foreground text-sm" role="status">
          {t("searching")}
        </p>
      ) : null}
      {lookup.state === "failed" ? (
        <p className="text-danger text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      {lookup.state === "done" && candidates.length === 0 ? (
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <ImageIcon className="size-4" />
          {t("none")}
        </p>
      ) : null}
      {candidates.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {candidates.map((candidate, index) => (
            <li className="grid content-start gap-2" key={candidate.url}>
              <CandidatePicture
                candidate={candidate}
                className="w-full"
                index={index}
                onBroken={() =>
                  setBroken((current) => new Set(current).add(candidate.url))
                }
                size={240}
              />
              <div className="grid gap-0.5 text-sm">
                <span className="font-medium" dir="auto">
                  {candidate.title}
                </span>
                {candidate.subtitle ? (
                  <span className="text-muted-foreground text-xs" dir="auto">
                    {candidate.subtitle}
                  </span>
                ) : null}
                <span className="text-muted-foreground text-xs">
                  {t(`source.${candidate.source}`)}
                </span>
              </div>
              <Button
                disabled={saving !== null}
                onClick={() => use(candidate.url)}
                size="sm"
                type="button"
              >
                {saving === candidate.url ? <Spinner /> : null}
                {t("use")}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
};
