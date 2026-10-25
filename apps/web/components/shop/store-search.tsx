import { Input } from "@repo/design-system/components/ui/input";
import { Search } from "lucide-react";

interface StoreSearchProps {
  /** The page that lists the results (`localePath(locale, "/store")`). */
  readonly action: string;
  readonly defaultValue?: string;
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
}

/** The storefront's search box: a plain GET form, so it works without JS. */
export const StoreSearch = ({
  action,
  defaultValue,
  id,
  label,
  placeholder,
}: StoreSearchProps) => (
  <search>
    <form action={action} method="get">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          className="h-12 rounded-full ps-12 text-base"
          defaultValue={defaultValue}
          enterKeyHint="search"
          id={id}
          maxLength={100}
          name="q"
          placeholder={placeholder}
          type="search"
        />
      </div>
    </form>
  </search>
);
