"use client";

import { usePathname } from "@repo/internationalization/navigation";
import type { ReactNode } from "react";
import { isEmbedPath } from "@/lib/pass-embed";

/**
 * The header, footer and tabs, on every page except the live card a
 * partner shows in a frame (and its connect popup).
 */
export const SiteChrome = ({ children }: { readonly children: ReactNode }) =>
  isEmbedPath(usePathname()) ? null : children;
