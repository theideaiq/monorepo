import { Skeleton } from "@repo/design-system/components/ui/skeleton";

const cards = ["a", "b", "c", "d"];

/** Shown while a page loads: the shape of a storefront, not a blank screen. */
const Loading = () => (
  <div
    aria-busy="true"
    className="container mx-auto flex flex-col gap-6 px-4 py-6"
  >
    <Skeleton className="h-8 w-2/3 max-w-sm" />
    <Skeleton className="h-12 w-full rounded-full" />
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div className="flex flex-col gap-3" key={card}>
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  </div>
);

export default Loading;
