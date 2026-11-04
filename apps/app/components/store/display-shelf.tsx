"use client";

import { hasPriceRange, localized } from "@repo/commerce";
import type { ProductCard } from "@repo/commerce/catalog";
import { cn } from "@repo/design-system/lib/utils";
import { Link } from "@repo/internationalization/navigation";
import { MoveRight } from "lucide-react";
import { useLocale } from "next-intl";
import { Price } from "./price";
import { productHref } from "./product-card";
import { ProductImage } from "./product-image";

interface DisplayShelfProps {
  readonly action: { href: string; label: string };
  /** A record crate (square sleeves that lift) or a books shelf (on a plank). */
  readonly kind: "crate" | "shelf";
  readonly products: readonly ProductCard[];
  readonly title: string;
}

/**
 * Home's Music crate and Books shelf: real covers only, flipped through
 * like records in a crate or standing on a shelf. Flat shapes from the
 * radius scale, no gradients; the lift uses the "switch on" easing and
 * stays still with reduced motion.
 */
export const DisplayShelf = ({
  action,
  kind,
  products,
  title,
}: DisplayShelfProps) => {
  const locale = useLocale();
  const crate = kind === "crate";
  return (
    <section
      className="container mx-auto flex flex-col gap-4 px-4 py-6"
      data-display={kind}
    >
      <div className="flex items-end justify-between gap-4">
        <h2 className="font-bold text-xl tracking-tight md:text-2xl">
          {title}
        </h2>
        <Link
          className="inline-flex shrink-0 items-center gap-1 font-medium text-pink-text text-sm hover:underline"
          href={action.href}
        >
          {action.label}
          <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </div>
      <div
        className={cn(
          crate ? "rounded-[28px] border bg-surface-sunken px-4 pt-6 pb-4" : ""
        )}
      >
        <ul
          className={cn(
            "no-scrollbar -mx-4 flex snap-x snap-proximity scroll-px-4 overflow-x-auto px-4 pt-2",
            crate ? "gap-3" : "gap-4"
          )}
        >
          {products.map((product) => {
            const name = localized(product, "name", locale);
            return (
              <li
                className="w-[40%] shrink-0 snap-start sm:w-[26%] md:w-[18%] lg:w-[15%]"
                key={product.id}
              >
                <Link
                  className="group grid content-start gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  href={productHref(product.slug)}
                >
                  <span className="grid">
                    <ProductImage
                      alt={name}
                      className={cn(
                        "bg-surface-raised shadow-1 transition-transform duration-[120ms] ease-switch-on motion-reduce:transition-none",
                        crate
                          ? "group-hover:-translate-y-2 group-focus-visible:-translate-y-2 motion-reduce:group-focus-visible:translate-y-0 motion-reduce:group-hover:translate-y-0"
                          : "rounded-sm"
                      )}
                      path={product.images[0]}
                      sizes="(min-width: 1024px) 15vw, 40vw"
                    />
                    {crate ? null : (
                      // The plank: each tile's piece meets its neighbours'
                      // across the gap, so the covers stand on one shelf.
                      <span
                        aria-hidden="true"
                        className="-mx-2 h-2.5 bg-border-strong"
                      />
                    )}
                  </span>
                  <span className="line-clamp-2 font-medium text-sm">
                    {name}
                  </span>
                  <Price
                    className="text-sm"
                    compareAtPrice={product.compare_at_price}
                    from={hasPriceRange(product.variants)}
                    price={product.price}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
