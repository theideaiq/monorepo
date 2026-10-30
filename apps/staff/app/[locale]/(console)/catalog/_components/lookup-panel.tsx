"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, TextField } from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import {
  applyLookup,
  type LookupCandidate,
  lookUpProduct,
} from "../lookup-actions";

interface LookupPanelProps {
  readonly barcode: string | null;
  readonly creator: string | null;
  readonly family: string;
  readonly linked: Record<string, unknown>;
  readonly productId: string;
  readonly title: string;
}

interface Found {
  candidates: LookupCandidate[];
  failed: LookupCandidate["source"][];
}

/**
 * "Look up" on the product page: searches the sources for the product's
 * family (books, music, games, films, board games, trading cards) by
 * barcode or title, and fills in the source ID, missing details, picture
 * and barcode from the item the staff member picks.
 */
export const LookupPanel = ({
  barcode,
  creator,
  family,
  linked,
  productId,
  title,
}: LookupPanelProps) => {
  const t = useTranslations("admin.catalog.lookup");
  const [found, setFound] = useState<Found | null>(null);

  return (
    <Panel description={t("description")} title={t("title")}>
      <ActionForm
        action={lookUpProduct}
        onSuccess={(state) =>
          setFound((state.data as Found | undefined) ?? null)
        }
        silent
      >
        <input name="family" type="hidden" value={family} />
        <FieldGrid columns={3}>
          <TextField
            defaultValue={barcode ?? ""}
            dir="ltr"
            inputMode="numeric"
            label={t("barcode")}
            name="barcode"
          />
          <TextField
            defaultValue={title}
            dir="auto"
            label={t("text")}
            name="text"
          />
          <TextField
            defaultValue={creator ?? ""}
            dir="auto"
            label={t("creator")}
            name="creator"
          />
        </FieldGrid>
        <SubmitButton>{t("search")}</SubmitButton>
      </ActionForm>
      {found && found.failed.length > 0 ? (
        <p className="text-muted-foreground text-sm" role="status">
          {t("failed", {
            sources: found.failed
              .map((source) => t(`source.${source}`))
              .join(", "),
          })}
        </p>
      ) : null}
      {found && found.candidates.length === 0 ? (
        <p className="text-muted-foreground text-sm" role="status">
          {t("none")}
        </p>
      ) : null}
      {found && found.candidates.length > 0 ? (
        <ul className="grid gap-2">
          {found.candidates.map((candidate) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
              key={`${candidate.source}:${candidate.id}`}
            >
              <div className="grid gap-0.5">
                <a
                  className="font-medium hover:underline"
                  dir="auto"
                  href={candidate.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {candidate.title}
                </a>
                <span className="text-muted-foreground text-xs" dir="auto">
                  {[
                    candidate.creator,
                    candidate.year ? String(candidate.year) : null,
                    t(`source.${candidate.source}`),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {candidate.barcode ? (
                  <span className="text-muted-foreground text-xs" dir="ltr">
                    {candidate.barcode}
                  </span>
                ) : null}
              </div>
              {String(linked[candidate.source] ?? "") === candidate.id ? (
                <span className="text-muted-foreground text-xs">
                  {t("linked")}
                </span>
              ) : (
                <ActionButton
                  action={applyLookup}
                  fields={{ candidate: JSON.stringify(candidate), productId }}
                  size="sm"
                >
                  {t("use")}
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
};
