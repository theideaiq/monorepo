"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/**
 * False on the server and while a component hydrates, true afterwards.
 * For client data that may already be in the query cache when a late
 * Suspense boundary hydrates: render it only once this is true, so the
 * first client render matches the server's HTML.
 */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
