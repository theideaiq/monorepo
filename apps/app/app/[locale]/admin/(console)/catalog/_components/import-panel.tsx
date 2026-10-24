"use client";

import { createClient } from "@repo/auth/client";
import type { Json } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { Label } from "@repo/design-system/components/ui/label";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Locale } from "@repo/internationalization";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ChangeEvent, useId, useMemo, useRef, useState } from "react";
import { NativeSelect } from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import {
  buildPreview,
  type Category,
  chunk,
  EXISTING_PRODUCT_COLUMNS,
  type ExistingProduct,
  IMPORT_BATCH_SIZE,
  importItems,
  type PreviewRow,
  parseSheet,
  type RowError,
  templateCsv,
} from "@/lib/admin/catalog-import";
import { formatters } from "@/lib/admin/format";
import { useRouter } from "@/lib/admin/navigation";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Slugs per catalog lookup (they go in the URL). */
const LOOKUP_BATCH = 100;
/** Preview rows rendered at once. */
const SHOWN_ROWS = 500;

type Status = PreviewRow["status"];
type Problem =
  | "empty"
  | "lookupFailed"
  | "noNameOrSlug"
  | "tooLarge"
  | "unreadable";

const statuses: Status[] = ["new", "changed", "unchanged", "error"];
const tones: Record<Status, Tone> = {
  changed: "warning",
  error: "danger",
  new: "info",
  unchanged: "neutral",
};

interface Outcome {
  inserted: number;
  updated: number;
}

const downloadTemplate = () => {
  const url = URL.createObjectURL(
    new Blob([templateCsv()], { type: "text/csv;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "catalog-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
};

interface SheetResult {
  preview: PreviewRow[];
  problem: Problem | null;
  unknownColumns: string[];
}

/** Reads, validates and compares a chosen file with the catalog. */
const readSheet = async (
  file: File,
  categories: Category[],
  loadExisting: (slugs: string[]) => Promise<ExistingProduct[]>
): Promise<SheetResult> => {
  const failed = (problem: Problem, unknownColumns: string[] = []) => ({
    preview: [],
    problem,
    unknownColumns,
  });
  if (file.size > MAX_FILE_BYTES) {
    return failed("tooLarge");
  }
  let text: string;
  try {
    text = await file.text();
  } catch {
    return failed("unreadable");
  }
  const sheet = parseSheet(
    text,
    new Set(categories.map((category) => category.slug))
  );
  if (sheet.problem) {
    return failed(sheet.problem, sheet.unknownColumns);
  }
  const slugs = [...new Set(sheet.rows.map((row) => row.slug).filter(Boolean))];
  try {
    return {
      preview: buildPreview(sheet.rows, await loadExisting(slugs), categories),
      problem: null,
      unknownColumns: sheet.unknownColumns,
    };
  } catch {
    return failed("lookupFailed", sheet.unknownColumns);
  }
};

const countStatuses = (preview: readonly PreviewRow[]) => {
  const result: Record<Status, number> = {
    changed: 0,
    error: 0,
    new: 0,
    unchanged: 0,
  };
  for (const row of preview) {
    result[row.status] += 1;
  }
  return result;
};

interface ImportStatusProps {
  readonly busy: boolean;
  readonly failure: string | null;
  readonly outcome: Outcome | null;
  readonly problem: Problem | null;
  readonly progress: { done: number; total: number } | null;
  readonly unknownColumns: string[];
}

/** Problems with the file, and the outcome or progress of applying it. */
const ImportStatus = ({
  busy,
  failure,
  outcome,
  problem,
  progress,
  unknownColumns,
}: ImportStatusProps) => {
  const t = useTranslations("admin.catalog.import");
  const locale = useLocale() as Locale;
  const format = formatters(locale);
  const separator = locale === "ar" ? "، " : ", ";

  return (
    <>
      {problem ? (
        <p className="text-danger text-sm" role="alert">
          {t(`problems.${problem}`)}
        </p>
      ) : null}
      {unknownColumns.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("unknownColumns", { columns: unknownColumns.join(separator) })}
        </p>
      ) : null}

      {outcome ? (
        <p className="text-sm" role="status">
          {t("applied", {
            inserted: format.number(outcome.inserted),
            updated: format.number(outcome.updated),
          })}
        </p>
      ) : null}
      {failure ? (
        <p className="text-danger text-sm" role="alert">
          {t("applyFailed", { message: failure })}
        </p>
      ) : null}
      {progress && busy ? (
        <p className="text-muted-foreground text-sm" role="status">
          {t("applying", {
            done: format.number(progress.done),
            total: format.number(progress.total),
          })}
        </p>
      ) : null}
    </>
  );
};

/** The preview rows: line, product, result and what changes or is wrong. */
const PreviewTable = ({ rows }: { readonly rows: PreviewRow[] }) => {
  const t = useTranslations("admin.catalog.import");
  const locale = useLocale() as Locale;
  const format = formatters(locale);
  const separator = locale === "ar" ? "، " : ", ";

  const fieldName = (field: string) => {
    const key = `fieldNames.${field}` as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : field;
  };

  const errorText = (error: RowError) => {
    const problemText = t(`errors.${error.code}`);
    return error.column
      ? t("errorLine", { field: fieldName(error.column), problem: problemText })
      : problemText;
  };

  const rowDetails = (row: PreviewRow) => {
    switch (row.status) {
      case "new":
        return t("newFields", {
          fields: Object.keys(row.fields).map(fieldName).join(separator),
        });
      case "changed":
        return t("changedFields", {
          fields: row.changed.map(fieldName).join(separator),
        });
      case "error":
        return (
          <ul className="grid gap-0.5 text-danger">
            {row.errors.map((error) => (
              <li key={`${error.code}-${error.column ?? ""}`}>
                {errorText(error)}
              </li>
            ))}
          </ul>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">{t("table.line")}</TableHead>
            <TableHead>{t("table.product")}</TableHead>
            <TableHead>{t("table.result")}</TableHead>
            <TableHead>{t("table.details")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.line}-${row.slug}`}>
              <TableCell className="tabular-nums">
                {format.number(row.line)}
              </TableCell>
              <TableCell>
                {"fields" in row && row.fields.name_en ? (
                  <span className="block" dir="auto">
                    {row.fields.name_en}
                  </span>
                ) : null}
                <span className="block text-muted-foreground text-xs" dir="ltr">
                  {row.slug || "—"}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge tone={tones[row.status]}>
                  {t(`status.${row.status}`)}
                </StatusBadge>
              </TableCell>
              <TableCell className="whitespace-normal text-sm">
                {rowDetails(row)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

/**
 * Upload → preview → apply. Everything runs in the browser with the staff
 * member's session: the sheet is parsed here, compared with the products
 * read under RLS, and saved in batches through `import_products`, which
 * checks the catalog role itself.
 */
export const ImportPanel = ({
  categories,
}: {
  readonly categories: Category[];
}) => {
  const t = useTranslations("admin.catalog.import");
  const locale = useLocale() as Locale;
  const format = formatters(locale);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const inputId = useId();
  const filterId = useId();
  const input = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [unknownColumns, setUnknownColumns] = useState<string[]>([]);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [filter, setFilter] = useState<Status | "">("");
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const reset = () => {
    setProblem(null);
    setUnknownColumns([]);
    setPreview([]);
    setFilter("");
    setProgress(null);
    setOutcome(null);
    setFailure(null);
  };

  const loadExisting = async (slugs: string[]) => {
    const found: ExistingProduct[] = [];
    for (const batch of chunk(slugs, LOOKUP_BATCH)) {
      // biome-ignore lint/performance/noAwaitInLoops: keeps each URL short
      const { data, error } = await supabase
        .from("products")
        .select(EXISTING_PRODUCT_COLUMNS)
        .in("slug", batch);
      if (error) {
        throw error;
      }
      found.push(...(data ?? []));
    }
    return found;
  };

  const read = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    reset();
    setFileName(file.name);
    setBusy(true);
    try {
      const result = await readSheet(file, categories, loadExisting);
      setUnknownColumns(result.unknownColumns);
      setProblem(result.problem);
      setPreview(result.preview);
    } finally {
      setBusy(false);
    }
  };

  const items = useMemo(() => importItems(preview), [preview]);
  const counts = useMemo(() => countStatuses(preview), [preview]);
  const visible = (
    filter ? preview.filter((row) => row.status === filter) : preview
  ).slice(0, SHOWN_ROWS);
  const filteredCount = filter ? counts[filter] : preview.length;

  const apply = async () => {
    const batches = chunk(items, IMPORT_BATCH_SIZE);
    const total: Outcome = { inserted: 0, updated: 0 };
    setBusy(true);
    setFailure(null);
    setProgress({ done: 0, total: items.length });
    try {
      let done = 0;
      for (const batch of batches) {
        // biome-ignore lint/performance/noAwaitInLoops: one transaction per batch, in order
        const { data, error } = await supabase.rpc("import_products", {
          items: batch as unknown as Json,
        });
        if (error) {
          setFailure(error.message);
          break;
        }
        const result = (data ?? {}) as Partial<Outcome>;
        total.inserted += result.inserted ?? 0;
        total.updated += result.updated ?? 0;
        done += batch.length;
        setProgress({ done, total: items.length });
      }
      setOutcome(total);
      setPreview([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      actions={
        <Button onClick={downloadTemplate} size="sm" variant="outline">
          <DownloadIcon />
          {t("template")}
        </Button>
      }
      description={t("description")}
      title={t("title")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <input
          accept=".csv,text/csv,text/tab-separated-values"
          className="sr-only"
          id={inputId}
          onChange={read}
          ref={input}
          type="file"
        />
        <Button
          disabled={busy}
          onClick={() => input.current?.click()}
          type="button"
        >
          {busy ? <Spinner /> : <UploadIcon />}
          {fileName ? t("chooseAnother") : t("choose")}
        </Button>
        <Label className="sr-only" htmlFor={inputId}>
          {t("choose")}
        </Label>
        {fileName ? (
          <span className="text-muted-foreground text-sm" dir="auto">
            {t("file", { name: fileName })}
          </span>
        ) : null}
        {busy && !progress ? (
          <span className="text-muted-foreground text-sm">{t("reading")}</span>
        ) : null}
      </div>

      <ImportStatus
        busy={busy}
        failure={failure}
        outcome={outcome}
        problem={problem}
        progress={progress}
        unknownColumns={unknownColumns}
      />

      {preview.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {t("summary", {
                changed: format.number(counts.changed),
                error: format.number(counts.error),
                new: format.number(counts.new),
                unchanged: format.number(counts.unchanged),
              })}
            </p>
            <div className="flex items-center gap-2">
              <Label htmlFor={filterId}>{t("show")}</Label>
              <NativeSelect
                className="w-auto"
                id={filterId}
                onChange={(event) =>
                  setFilter(event.target.value as Status | "")
                }
                options={[
                  { label: t("showAll"), value: "" },
                  ...statuses.map((status) => ({
                    label: t(`status.${status}`),
                    value: status,
                  })),
                ]}
                value={filter}
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noRows")}</p>
          ) : (
            <PreviewTable rows={visible} />
          )}
          {filteredCount > visible.length ? (
            <p className="text-muted-foreground text-sm">
              {t("truncated", {
                shown: format.number(visible.length),
                total: format.number(filteredCount),
              })}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3">
            {counts.error > 0 ? (
              <span className="text-muted-foreground text-sm">
                {t("errorsSkipped")}
              </span>
            ) : null}
            {items.length > 0 ? (
              <Button disabled={busy} onClick={apply} type="button">
                {busy ? <Spinner /> : null}
                {t("apply", { count: format.number(items.length) })}
              </Button>
            ) : (
              <span className="text-sm">{t("nothingToApply")}</span>
            )}
          </div>
        </>
      ) : null}
    </Panel>
  );
};
