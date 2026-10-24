"use client";

import { Label } from "@repo/design-system/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { cn } from "@repo/design-system/lib/utils";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useFormContext } from "./action-form";
import { MarkdownPreview } from "./markdown-preview";

interface MarkdownEditorProps {
  readonly defaultValue?: string | null;
  /** Text direction of the content (an Arabic body in an English UI…). */
  readonly dir?: "ltr" | "rtl" | "auto";
  readonly hint?: string;
  readonly label: string;
  readonly maxLength?: number;
  readonly name: string;
  readonly rows?: number;
}

/** A Markdown textarea with a rendered preview tab. */
export const MarkdownEditor = ({
  defaultValue,
  dir,
  hint,
  label,
  maxLength,
  name,
  rows = 14,
}: MarkdownEditorProps) => {
  const t = useTranslations("admin.markdown");
  const id = useId();
  const { invalid } = useFormContext();
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <Tabs className="grid gap-2" defaultValue="write">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className={cn(invalid(name) && "text-destructive")} htmlFor={id}>
          {label}
        </Label>
        <TabsList>
          <TabsTrigger value="write">{t("write")}</TabsTrigger>
          <TabsTrigger value="preview">{t("preview")}</TabsTrigger>
        </TabsList>
      </div>
      {/* forceMount keeps the textarea in the form while previewing. */}
      <TabsContent
        className="data-[state=inactive]:hidden"
        forceMount
        value="write"
      >
        <Textarea
          aria-invalid={invalid(name) || undefined}
          className="min-h-48 font-mono text-sm"
          dir={dir}
          id={id}
          maxLength={maxLength}
          name={name}
          onChange={(event) => setValue(event.target.value)}
          rows={rows}
          value={value}
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className="min-h-48 rounded-md border p-4" dir={dir}>
          {value.trim() ? (
            <MarkdownPreview source={value} />
          ) : (
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          )}
        </div>
      </TabsContent>
      <p className="text-muted-foreground text-xs">{hint ?? t("hint")}</p>
    </Tabs>
  );
};
