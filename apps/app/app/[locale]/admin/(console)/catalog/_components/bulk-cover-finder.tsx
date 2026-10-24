"use client";

import { createClient } from "@repo/auth/client";
import type { Json } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { cn } from "@repo/design-system/lib/utils";
import { CheckIcon, SearchIcon, SquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type CoverCandidate, findCovers } from "@/lib/admin/covers";
import { useRouter } from "@/lib/admin/navigation";
import { CandidatePicture, withCover } from "./cover-finder";

interface BulkProduct {
  readonly categorySlug: string | null;
  readonly details: Json;
  readonly id: string;
  readonly images: string[];
  readonly name_en: string;
}

type RowState =
  | { state: "waiting" }
  | { state: "searching" }
  | { state: "failed" }
  | { candidates: CoverCandidate[]; state: "done" }
  | { state: "saved" };

/**
 * "Find missing pictures": searches every product without images one after
 * another (MusicBrainz allows one request a second), preselects the first
 * candidate of each, and saves the ones the staff member keeps.
 */
export const BulkCoverFinder = ({
  products,
}: {
  readonly products: readonly BulkProduct[];
}) => {
  const t = useTranslations("admin.catalog.covers");
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [chosen, setChosen] = useState<Record<string, string | null>>({});
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const setRow = (id: string, state: RowState) =>
    setRows((current) => ({ ...current, [id]: state }));

  const start = async () => {
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true);
    for (const product of products) {
      if (controller.signal.aborted) {
        break;
      }
      const previous = rows[product.id]?.state;
      if (previous === "done" || previous === "saved") {
        continue;
      }
      setRow(product.id, { state: "searching" });
      try {
        // biome-ignore lint/performance/noAwaitInLoops: one product at a time, within MusicBrainz' rate limit
        const candidates = await findCovers(product, product.categorySlug, {
          limit: 3,
          signal: controller.signal,
        });
        setRow(product.id, { candidates, state: "done" });
        setChosen((current) => ({
          ...current,
          [product.id]: candidates[0]?.url ?? null,
        }));
      } catch {
        setRow(product.id, {
          state: controller.signal.aborted ? "waiting" : "failed",
        });
      }
    }
    setRunning(false);
  };

  const stop = () => abort.current?.abort();

  const selected = products.filter((product) => {
    const url = chosen[product.id];
    return url && !broken.has(url) && rows[product.id]?.state === "done";
  });

  const save = async () => {
    setSaving(true);
    let failed = 0;
    for (const product of selected) {
      const url = chosen[product.id];
      if (!url) {
        continue;
      }
      // biome-ignore lint/performance/noAwaitInLoops: a handful of small updates, each reported on its row
      const { data, error } = await supabase
        .from("products")
        .update({ images: withCover(product.images, url) })
        .eq("id", product.id)
        .select("id");
      if (error || !data?.length) {
        failed += 1;
      } else {
        setRow(product.id, { state: "saved" });
      }
    }
    setSaving(false);
    if (failed > 0) {
      toast.error(t("saveFailed"));
    } else {
      toast.success(t("saved"));
    }
    router.refresh();
  };

  const done = products.filter((product) => {
    const state = rows[product.id]?.state;
    return state === "done" || state === "saved" || state === "failed";
  }).length;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {running ? (
          <Button onClick={stop} type="button" variant="outline">
            <Spinner />
            {t("stop")}
          </Button>
        ) : (
          <Button onClick={start} type="button" variant="outline">
            <SearchIcon />
            {t("start")}
          </Button>
        )}
        <Button
          disabled={saving || running || selected.length === 0}
          onClick={save}
          type="button"
        >
          {saving ? <Spinner /> : null}
          {t("saveSelected", { count: String(selected.length) })}
        </Button>
        <span className="text-muted-foreground text-sm" role="status">
          {t("progress", {
            done: String(done),
            total: String(products.length),
          })}
        </span>
      </div>
      <ul className="grid gap-3">
        {products.map((product) => {
          const row = rows[product.id] ?? { state: "waiting" };
          const candidates =
            row.state === "done"
              ? row.candidates.filter((item) => !broken.has(item.url))
              : [];
          return (
            <li
              className="grid gap-3 rounded-lg border bg-card p-4"
              key={product.id}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium" dir="auto">
                  {product.name_en}
                </span>
                <span className="text-muted-foreground text-xs">
                  {row.state === "waiting" ? t("waiting") : null}
                  {row.state === "searching" ? t("searching") : null}
                  {row.state === "failed" ? t("failed") : null}
                  {row.state === "saved" ? t("savedRow") : null}
                  {row.state === "done" && candidates.length === 0
                    ? t("none")
                    : null}
                </span>
              </div>
              {candidates.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {candidates.map((candidate, index) => {
                    const active = chosen[product.id] === candidate.url;
                    return (
                      <button
                        aria-pressed={active}
                        className={cn(
                          "relative rounded-md outline-offset-2 focus-visible:outline-2",
                          active ? "ring-2 ring-primary" : "opacity-70"
                        )}
                        key={candidate.url}
                        onClick={() =>
                          setChosen((current) => ({
                            ...current,
                            [product.id]: candidate.url,
                          }))
                        }
                        type="button"
                      >
                        <CandidatePicture
                          candidate={candidate}
                          index={index}
                          onBroken={() =>
                            setBroken((current) =>
                              new Set(current).add(candidate.url)
                            )
                          }
                          size={96}
                        />
                        {active ? (
                          <CheckIcon className="absolute end-1 top-1 size-5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                        ) : null}
                      </button>
                    );
                  })}
                  <Button
                    aria-pressed={chosen[product.id] === null}
                    className="self-center"
                    onClick={() =>
                      setChosen((current) => ({
                        ...current,
                        [product.id]: null,
                      }))
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <SquareIcon />
                    {t("skip")}
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
