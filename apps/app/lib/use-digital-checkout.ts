"use client";

import { useSyncExternalStore } from "react";
import { canSellDigitalGoods } from "./native/checkout";

const subscribe = () => () => undefined;

/**
 * `canSellDigitalGoods()` for client components that are also rendered on
 * the server: null while the platform isn't known yet (server render and
 * hydration), then true or false in the browser. Render the purchase button
 * only for `true` and the "managed on the website" note only for `false`,
 * so neither flashes inside the iOS/Android apps or on the web.
 */
export const useCanSellDigitalGoods = (): boolean | null =>
  useSyncExternalStore(
    subscribe,
    () => canSellDigitalGoods(),
    () => null
  );
