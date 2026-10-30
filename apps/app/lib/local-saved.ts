"use client";

import { useSyncExternalStore } from "react";

/**
 * Hearts saved while signed out, kept in this browser until sign-in merges
 * them into Saved (`SavedMerger`). Storage can be missing or full (private
 * windows): then nothing is kept, and nothing breaks.
 */

const KEY = "the-idea:saved";
const CHANGED = "the-idea:saved-changed";
const MAX_ITEMS = 100;

const read = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  try {
    if (ids.length === 0) {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, JSON.stringify(ids.slice(-MAX_ITEMS)));
    }
  } catch {
    // Storage is unavailable; the heart just won't stick.
  }
  window.dispatchEvent(new Event(CHANGED));
};

export const localSaved = read;

export const toggleLocalSaved = (productId: string) => {
  const ids = read();
  write(
    ids.includes(productId)
      ? ids.filter((id) => id !== productId)
      : [...ids, productId]
  );
};

export const clearLocalSaved = () => write([]);

const subscribe = (onChange: () => void) => {
  window.addEventListener(CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
};

/** Whether a product is hearted in this browser (signed out). */
export const useLocallySaved = (productId: string) =>
  useSyncExternalStore(
    subscribe,
    () => read().includes(productId),
    () => false
  );
