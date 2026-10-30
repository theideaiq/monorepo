"use client";

import { formatPrice } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { formatNumber } from "@repo/internationalization/format";
import { DownloadIcon, ImageOffIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ChangeEvent, useId, useState } from "react";
import {
  MAX_QUANTITY,
  MIN_PRICE,
  type UploadItem,
  type UploadMatch,
  type UploadResult,
  useApplyUpload,
  useCategories,
  useMatchUpload,
} from "@/lib/listing-queries";
import {
  MAX_UPLOAD_ROWS,
  parseUpload,
  type UploadProblem,
  type UploadRow,
  uploadTemplateCsv,
} from "@/lib/listing-upload";

/** Files larger than this aren't read (500 rows fit easily). */
const MAX_FILE_BYTES = 1_000_000;

type FileProblem = UploadProblem | "lookupFailed" | "tooLarge" | "unreadable";

type RowStatus = "error" | "matched" | "needsDetails" | "new";

interface CheckedRow {
  item?: UploadItem;
  match?: UploadMatch;
  row: UploadRow;
  status: RowStatus;
}

const downloadTemplate = () => {
  const url = URL.createObjectURL(
    new Blob([uploadTemplateCsv()], { type: "text/csv;charset=utf-8" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "listings-template.csv";
  link.click();
  URL.revokeObjectURL(url);
};

const offerOf = (row: UploadRow) => ({
  condition: row.condition,
  price: row.price,
  quantity: row.quantity,
  sku: row.sku,
});

/** What each row will do, given the barcodes found and the categories. */
const checkRows = (
  rows: readonly UploadRow[],
  matches: ReadonlyMap<string, UploadMatch>,
  categoryIds: ReadonlyMap<string, string>
): CheckedRow[] =>
  rows.map((row) => {
    if (row.errors.length > 0) {
      return { row, status: "error" };
    }
    const match = matches.get(row.barcode);
    if (match) {
      return {
        item: {
          line: row.line,
          offer: offerOf(row),
          variantId: match.variantId,
        },
        match,
        row,
        status: "matched",
      };
    }
    const categoryId = row.product
      ? categoryIds.get(row.product.categorySlug)
      : undefined;
    if (!(row.product && categoryId)) {
      return { row, status: "needsDetails" };
    }
    return {
      item: {
        line: row.line,
        offer: offerOf(row),
        product: {
          barcode: row.barcode,
          categoryId,
          nameAr: row.product.nameAr,
          nameEn: row.product.nameEn,
        },
      },
      row,
      status: "new",
    };
  });

const STATUS_VARIANT: Record<
  RowStatus,
  "default" | "destructive" | "secondary"
> = {
  error: "destructive",
  matched: "secondary",
  needsDetails: "destructive",
  new: "default",
};

const RowNote = ({
  categories,
  checked,
  result,
}: {
  readonly categories: string;
  readonly checked: CheckedRow;
  readonly result?: UploadResult;
}) => {
  const t = useTranslations("app.company.listings.upload");
  const problems = useTranslations("app.company.listings.problems");
  const locale = useLocale();
  if (result) {
    return result.problem ? (
      <span className="text-destructive">{problems(result.problem)}</span>
    ) : (
      <span>{t("sent")}</span>
    );
  }
  if (checked.status === "error") {
    return (
      <span className="text-destructive">
        {checked.row.errors
          .map((code) =>
            t(`errors.${code}`, {
              categories,
              max: formatNumber(MAX_QUANTITY, locale),
              min: formatNumber(MIN_PRICE, locale),
            })
          )
          .join(" ")}
      </span>
    );
  }
  if (checked.status === "needsDetails") {
    return <span className="text-destructive">{t("needsDetailsHint")}</span>;
  }
  return null;
};

const rowName = (checked: CheckedRow, locale: string) => {
  const names = checked.match ?? checked.row.product;
  if (!names) {
    return "";
  }
  return locale === "ar" ? names.nameAr : names.nameEn;
};

const RowsTable = ({
  categories,
  results,
  rows,
}: {
  readonly categories: string;
  readonly results: ReadonlyMap<number, UploadResult>;
  readonly rows: readonly CheckedRow[];
}) => {
  const t = useTranslations("app.company.listings.upload");
  const conditions = useTranslations("store.condition");
  const locale = useLocale();
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">{t("table.line")}</TableHead>
            <TableHead>{t("table.product")}</TableHead>
            <TableHead>{t("table.offer")}</TableHead>
            <TableHead>{t("table.result")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((checked) => (
            <TableRow key={checked.row.line}>
              <TableCell className="tabular-nums">
                {formatNumber(checked.row.line, locale)}
              </TableCell>
              <TableCell>
                <span className="grid">
                  <span className="font-medium">
                    {rowName(checked, locale)}
                  </span>
                  <span className="text-muted-foreground text-xs" dir="ltr">
                    {checked.row.barcode}
                  </span>
                </span>
              </TableCell>
              <TableCell className="text-sm">
                {checked.status === "error"
                  ? null
                  : t("offer", {
                      condition: conditions(checked.row.condition),
                      copies: formatNumber(checked.row.quantity, locale),
                      price: formatPrice(checked.row.price, locale),
                    })}
              </TableCell>
              <TableCell className="grid justify-items-start gap-1 text-sm">
                <Badge variant={STATUS_VARIANT[checked.status]}>
                  {t(`status.${checked.status}`)}
                </Badge>
                <RowNote
                  categories={categories}
                  checked={checked}
                  result={results.get(checked.row.line)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const countOf = (rows: readonly CheckedRow[], status: RowStatus) =>
  rows.filter((row) => row.status === status).length;

/**
 * Partners → Selling → Listings: many offers at once from a spreadsheet.
 * The file is read and checked here; nothing is sent until the shop
 * confirms, then each row is sent on its own.
 */
export const ListingUpload = ({ sellerId }: { readonly sellerId: string }) => {
  const t = useTranslations("app.company.listings.upload");
  const locale = useLocale();
  const id = useId();
  const categories = useCategories();
  const matchUpload = useMatchUpload();
  const applyUpload = useApplyUpload(sellerId);
  const [rows, setRows] = useState<CheckedRow[] | null>(null);
  const [problem, setProblem] = useState<FileProblem | null>(null);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<Map<number, UploadResult>>(
    () => new Map()
  );

  const reset = () => {
    setRows(null);
    setProblem(null);
    setDone(0);
    setResults(new Map());
  };

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    reset();
    if (!file) {
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setProblem("tooLarge");
      return;
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      setProblem("unreadable");
      return;
    }
    const list = categories.data ?? [];
    const sheet = parseUpload(
      text,
      new Set(list.map((category) => category.slug))
    );
    if (sheet.problem) {
      setProblem(sheet.problem);
      return;
    }
    try {
      const matches = await matchUpload.mutateAsync(
        sheet.rows
          .filter((row) => row.errors.length === 0)
          .map((row) => row.barcode)
      );
      setRows(
        checkRows(
          sheet.rows,
          matches,
          new Map(list.map((category) => [category.slug, category.id]))
        )
      );
    } catch {
      setProblem("lookupFailed");
    }
  };

  const categoryList = (categories.data ?? [])
    .map((category) => category.slug)
    .join(", ");
  const items = (rows ?? []).flatMap((row) => (row.item ? [row.item] : []));
  const finished = results.size > 0 && !applyUpload.isPending;

  const send = async () => {
    setDone(0);
    const sent = await applyUpload.mutateAsync({ items, onProgress: setDone });
    setResults(new Map(sent.map((result) => [result.line, result])));
  };

  const failed = [...results.values()].filter(
    (result) => result.problem
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { max: formatNumber(MAX_UPLOAD_ROWS, locale) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <Label htmlFor={`${id}-file`}>{t("file")}</Label>
            <Input
              accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
              disabled={
                categories.isPending ||
                matchUpload.isPending ||
                applyUpload.isPending
              }
              id={`${id}-file`}
              onChange={choose}
              type="file"
            />
          </div>
          <Button onClick={downloadTemplate} type="button" variant="outline">
            <DownloadIcon />
            {t("template")}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          {t("columns", { categories: categoryList })}
        </p>
        <p className="flex items-start gap-2 rounded-md border bg-surface-sunken p-3 text-sm">
          <ImageOffIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("photoHint")}
        </p>
        {matchUpload.isPending ? (
          <p className="text-muted-foreground text-sm" role="status">
            {t("checking")}
          </p>
        ) : null}
        {problem ? (
          <p className="text-destructive text-sm" role="alert">
            {t(`problems.${problem}`, {
              max: formatNumber(MAX_UPLOAD_ROWS, locale),
            })}
          </p>
        ) : null}
        {rows ? (
          <>
            <p className="text-sm" role="status">
              {t("summary", {
                errors: formatNumber(
                  countOf(rows, "error") + countOf(rows, "needsDetails"),
                  locale
                ),
                matched: formatNumber(countOf(rows, "matched"), locale),
                new: formatNumber(countOf(rows, "new"), locale),
              })}
            </p>
            <RowsTable
              categories={categoryList}
              results={results}
              rows={rows}
            />
            {finished ? (
              <p className="text-sm" role="status">
                {t("finished", {
                  failed: formatNumber(failed, locale),
                  sent: formatNumber(results.size - failed, locale),
                })}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              {finished ? null : (
                <Button
                  disabled={items.length === 0 || applyUpload.isPending}
                  onClick={send}
                  type="button"
                >
                  {applyUpload.isPending
                    ? t("sending", {
                        done: formatNumber(done, locale),
                        total: formatNumber(items.length, locale),
                      })
                    : t("send", { count: formatNumber(items.length, locale) })}
                </Button>
              )}
              <Button
                disabled={applyUpload.isPending}
                onClick={reset}
                type="button"
                variant="ghost"
              >
                {finished ? t("again") : t("cancel")}
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};
