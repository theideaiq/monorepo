"use client";

import { type ReactNode, useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { Bulb } from "./bulb";

/** Where a visitor's "switched on" is remembered (this browser only). */
export const SWITCH_ON_KEY = "idea:switched-on";

const remembered = () => {
  try {
    return window.localStorage.getItem(SWITCH_ON_KEY) === "1";
  } catch {
    return false;
  }
};

const remember = () => {
  try {
    window.localStorage.setItem(SWITCH_ON_KEY, "1");
  } catch {
    // Private windows and blocked storage: it just isn't remembered.
  }
};

interface SwitchOnProps {
  /** What the bulb reveals once it's switched on (the brand line). */
  readonly children: ReactNode;
  readonly className?: string;
  /** Shown in the revealed line's place until it's switched on. */
  readonly hint: string;
  /** The bulb button's name ("Switch on"). */
  readonly label: string;
}

/**
 * The Switch on moment: the bulb, unchanged, waits unlit above a headline;
 * one tap lights it and reveals `children` with the "switch on" motion
 * (opacity only with reduced motion). The visitor's tap is remembered in
 * this browser, so the bulb is already on next time.
 */
export const SwitchOn = ({
  children,
  className,
  hint,
  label,
}: SwitchOnProps) => {
  const [lit, setLit] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (remembered()) {
      setLit(true);
    }
  }, []);

  const switchOn = () => {
    if (lit) {
      return;
    }
    remember();
    setAnimate(true);
    setLit(true);
  };

  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      data-lit={lit ? "" : undefined}
      data-slot="switch-on"
    >
      <button
        aria-label={label}
        aria-pressed={lit}
        className={cn(
          "grid size-11 place-items-center rounded-full outline-none transition-colors duration-[240ms] ease-switch-on focus-visible:ring-2 focus-visible:ring-ring",
          lit
            ? "cursor-default text-idea-pink dark:text-bulb-yellow"
            : "cursor-pointer text-muted-foreground hover:text-idea-pink dark:hover:text-bulb-yellow"
        )}
        onClick={switchOn}
        type="button"
      >
        <Bulb className="size-6" />
      </button>
      <div className="grid justify-items-center">
        <div
          aria-hidden={!lit}
          className={cn(
            "[grid-area:1/1]",
            lit ? "" : "invisible",
            lit && animate
              ? "motion-safe:animate-switch-on motion-reduce:animate-switch-on-fade"
              : ""
          )}
        >
          {children}
        </div>
        {lit ? null : (
          <span className="text-muted-foreground text-sm [grid-area:1/1]">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
};
