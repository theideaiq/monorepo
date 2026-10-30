"use server";

import type { CommandBarGroup } from "@repo/design-system/lib/command-bar";
import type { Locale } from "@repo/internationalization";
import { getLocale } from "next-intl/server";
import { searchStaff } from "./search";
import { getSession } from "./session";

/**
 * The command bar's search: the same lookup as /search, for a signed-in
 * staff member at AAL2 (anyone else gets nothing back).
 */
export const searchConsole = async (
  query: string
): Promise<CommandBarGroup[]> => {
  if (typeof query !== "string") {
    return [];
  }
  const session = await getSession();
  if (session.status !== "ready") {
    return [];
  }
  const locale = (await getLocale()) as Locale;
  const groups = await searchStaff(
    session.supabase,
    session.staff.role,
    locale,
    query
  );
  return groups.map((group) => ({
    heading: group.title,
    id: group.id,
    items: group.hits.map((hit) => ({
      detail: hit.detail,
      href: hit.href,
      id: hit.id,
      label: hit.label,
    })),
  }));
};
