"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile, the security check on the sign-in forms. Supabase
 * Auth checks the token (Authentication → Attack Protection, provider
 * Turnstile, with the secret key); the site key is public. Without a site
 * key the widget isn't shown and no token is sent.
 */

interface TurnstileApi {
  execute: (widget: string) => void;
  remove: (widget: string) => void;
  render: (
    element: HTMLElement,
    options: {
      appearance: "interaction-only";
      callback: (token: string) => void;
      "error-callback": () => void;
      execution: "execute";
      "expired-callback": () => void;
      language: string;
      sitekey: string;
    }
  ) => string;
  reset: (widget: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<TurnstileApi | undefined> | undefined;

const loadTurnstile = () => {
  loading ??= new Promise((resolve) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      loading = undefined;
      resolve(undefined);
    };
    document.head.append(script);
  });
  return loading;
};

/** Waits at most this long for a token before trying without one. */
const TOKEN_TIMEOUT_MS = 15_000;

/**
 * The widget (it only shows itself when Cloudflare wants an interaction)
 * and `getToken`, which runs the check and returns a fresh, one-use token.
 */
export const useTurnstile = (siteKey: string | undefined, locale = "en") => {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const pending = useRef<((token: string | undefined) => void) | null>(null);

  useEffect(() => {
    if (!siteKey) {
      return;
    }
    let cancelled = false;
    const settle = (token: string | undefined) => {
      pending.current?.(token);
      pending.current = null;
    };
    loadTurnstile().then((api) => {
      if (cancelled || !api || !container.current) {
        return;
      }
      widget.current = api.render(container.current, {
        appearance: "interaction-only",
        callback: (token) => settle(token),
        "error-callback": () => settle(undefined),
        execution: "execute",
        "expired-callback": () => settle(undefined),
        language: locale,
        sitekey: siteKey,
      });
    });
    return () => {
      cancelled = true;
      if (widget.current) {
        window.turnstile?.remove(widget.current);
        widget.current = null;
      }
    };
  }, [locale, siteKey]);

  const getToken = useCallback((): Promise<string | undefined> => {
    const api = window.turnstile;
    if (!(siteKey && api && widget.current)) {
      return Promise.resolve(undefined);
    }
    const id = widget.current;
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(undefined), TOKEN_TIMEOUT_MS);
      pending.current = (token) => {
        clearTimeout(timer);
        resolve(token);
      };
      // Each token works once: start over for every request.
      api.reset(id);
      api.execute(id);
    });
  }, [siteKey]);

  const element = siteKey ? (
    <div className="flex justify-center" ref={container} />
  ) : null;

  return { element, getToken };
};
