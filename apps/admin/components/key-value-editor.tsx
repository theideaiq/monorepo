"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface Row {
  id: number;
  key: string;
  value: string;
}

interface KeyValueEditorProps {
  readonly defaultValue?: Record<string, unknown> | null;
  readonly label: string;
  /** Field name prefix: rows are submitted as prefixKey[] and prefixValue[]. */
  readonly prefix: string;
}

let nextId = 0;
const row = (key = "", value = ""): Row => {
  nextId += 1;
  return { id: nextId, key, value };
};

/** Rows of name/value pairs, e.g. product specifications. */
export const KeyValueEditor = ({
  defaultValue,
  label,
  prefix,
}: KeyValueEditorProps) => {
  const t = useTranslations("admin.keyValue");
  const [rows, setRows] = useState<Row[]>(() => {
    const entries = Object.entries(defaultValue ?? {}).map(([key, value]) =>
      row(key, String(value))
    );
    return entries.length > 0 ? entries : [row()];
  });

  const update = (id: number, change: Partial<Row>) =>
    setRows((current) =>
      current.map((item) => (item.id === id ? { ...item, ...change } : item))
    );

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-medium text-sm">{label}</legend>
      {rows.map((item) => (
        <div className="flex gap-2" key={item.id}>
          <Label className="sr-only" htmlFor={`${prefix}-${item.id}-key`}>
            {t("key")}
          </Label>
          <Input
            id={`${prefix}-${item.id}-key`}
            maxLength={60}
            name={`${prefix}Key[]`}
            onChange={(event) => update(item.id, { key: event.target.value })}
            placeholder={t("key")}
            value={item.key}
          />
          <Label className="sr-only" htmlFor={`${prefix}-${item.id}-value`}>
            {t("value")}
          </Label>
          <Input
            id={`${prefix}-${item.id}-value`}
            maxLength={300}
            name={`${prefix}Value[]`}
            onChange={(event) => update(item.id, { value: event.target.value })}
            placeholder={t("value")}
            value={item.value}
          />
          <Button
            aria-label={t("remove")}
            onClick={() =>
              setRows((current) =>
                current.length > 1
                  ? current.filter((other) => other.id !== item.id)
                  : [row()]
              )
            }
            size="icon"
            type="button"
            variant="ghost"
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <Button
        className="w-fit"
        onClick={() => setRows((current) => [...current, row()])}
        size="sm"
        type="button"
        variant="outline"
      >
        <PlusIcon />
        {t("add")}
      </Button>
    </fieldset>
  );
};
