"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ChangeEvent, type FormEvent, useId, useState } from "react";
import { ApiError, callApi } from "@/lib/api";
import { type ImportItem, parseListFile } from "@/lib/list-import";
import {
  useImportList,
  useRemoveWanted,
  type WantedItem,
} from "@/lib/list-queries";

type Account = "discogs" | "steam";

type Problem = "file" | "empty" | "not_found" | "private" | "unavailable";

const problemOf = (error: unknown): Problem =>
  error instanceof ApiError &&
  (error.code === "not_found" || error.code === "private")
    ? error.code
    : "unavailable";

/**
 * "Import your list" on a list in Pass → Saved → Lists: a Goodreads, The
 * StoryGraph or Letterboxd export, or a public Discogs wantlist or Steam
 * wishlist. What the store has joins the list with alerts on; the rest is
 * listed under "Not in the store yet", and joins the list when it arrives.
 */
export const ImportList = ({ listId }: { readonly listId: string }) => {
  const t = useTranslations("app.wishlist.lists.import");
  const locale = useLocale() as Locale;
  const id = useId();
  const { supabase } = useAuth();
  const run = useImportList();
  const [account, setAccount] = useState<Account>("discogs");
  const [name, setName] = useState("");
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [result, setResult] = useState<{
    matched: number;
    wanted: number;
  } | null>(null);
  const busy = reading || run.isPending;

  const importItems = (items: ImportItem[]) => {
    if (items.length === 0) {
      setProblem("empty");
      return;
    }
    run.mutate(
      { items, listId },
      {
        onError: () => setProblem("unavailable"),
        onSuccess: (counts) => setResult(counts),
      }
    );
  };

  const fromFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setProblem(null);
    setResult(null);
    if (!file) {
      return;
    }
    const parsed = parseListFile(await file.text());
    if (!parsed) {
      setProblem("file");
      return;
    }
    importItems(parsed.items);
  };

  const fromAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProblem(null);
    setResult(null);
    setReading(true);
    try {
      const { items } = await callApi<{ items: ImportItem[] }>(
        supabase,
        "/lists/import",
        { account: name, source: account }
      );
      importItems(items);
    } catch (error) {
      setProblem(problemOf(error));
    } finally {
      setReading(false);
    }
  };

  return (
    <details className="grid gap-3 rounded-md border p-3 text-sm">
      <summary className="cursor-pointer font-medium">{t("title")}</summary>
      <div className="grid gap-3 pt-3">
        <div className="grid gap-1">
          <Label htmlFor={`${id}-file`}>{t("file")}</Label>
          <Input
            accept=".csv,text/csv"
            disabled={busy}
            id={`${id}-file`}
            onChange={fromFile}
            type="file"
          />
          <p className="text-muted-foreground text-xs">{t("fileHint")}</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" onSubmit={fromAccount}>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-source`}>{t("from")}</Label>
            <Select
              onValueChange={(value) => setAccount(value as Account)}
              value={account}
            >
              <SelectTrigger className="w-40" id={`${id}-source`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discogs">{t("discogs")}</SelectItem>
                <SelectItem value="steam">{t("steam")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-48 flex-1 gap-1">
            <Label htmlFor={`${id}-account`}>{t(`${account}Account`)}</Label>
            <Input
              dir="ltr"
              id={`${id}-account`}
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </div>
          <Button disabled={busy || !name.trim()} type="submit">
            {busy ? t("importing") : t("import")}
          </Button>
        </form>
        {problem ? (
          <p className="text-destructive" role="alert">
            {t(`problems.${problem}`)}
          </p>
        ) : null}
        {result ? (
          <p className="text-muted-foreground" role="status">
            {t("done", {
              matched: formatNumber(result.matched, locale),
              wanted: formatNumber(result.wanted, locale),
            })}
          </p>
        ) : null}
      </div>
    </details>
  );
};

/** "Not in the store yet": imported items waiting for the store. */
export const WantedItems = ({
  items,
}: {
  readonly items: readonly WantedItem[];
}) => {
  const t = useTranslations("app.wishlist.lists.import");
  const remove = useRemoveWanted();
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="grid gap-1 text-sm">
      <p className="font-medium">{t("wanted")}</p>
      <p className="text-muted-foreground text-xs">{t("wantedHint")}</p>
      <ul className="grid gap-1">
        {items.map((item) => (
          <li className="flex items-center justify-between gap-2" key={item.id}>
            <span dir="auto">
              {item.creator ? `${item.title} · ${item.creator}` : item.title}
            </span>
            <Button
              aria-label={t("remove", { title: item.title })}
              disabled={remove.isPending}
              onClick={() => remove.mutate(item.id)}
              size="icon"
              variant="ghost"
            >
              <XIcon />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
