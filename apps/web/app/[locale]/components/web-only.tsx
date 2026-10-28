"use client";

import { type ReactNode, useEffect, useState } from "react";
import { isNativeApp } from "@/lib/platform";

/** Its children on the website only, never inside the iOS/Android apps. */
export const WebOnly = ({ children }: { readonly children: ReactNode }) => {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  return native ? null : children;
};
