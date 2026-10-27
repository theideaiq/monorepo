"use client";

import { Input } from "@repo/design-system/components/ui/input";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useRouter } from "@/lib/admin/navigation";

/**
 * Search across Staff: order, ticket, request and job numbers,
 * members (name or Pass number), products and ticket subjects (/search).
 */
export const AdminSearch = ({
  onSearch,
}: {
  readonly onSearch?: () => void;
}) => {
  const t = useTranslations("admin.search");
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/search?${new URLSearchParams({ q })}`);
      onSearch?.();
    }
  };

  return (
    <search>
      <form className="relative" onSubmit={submit}>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label={t("label")}
          className="h-8 ps-8"
          maxLength={120}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("placeholder")}
          type="search"
          value={query}
        />
      </form>
    </search>
  );
};
