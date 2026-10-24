"use client";

import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { cn } from "@repo/design-system/lib/utils";
import { type ComponentProps, type ReactNode, useId } from "react";
import { useFormContext } from "./action-form";

interface FieldShellProps {
  readonly children: (id: string, invalid: boolean) => ReactNode;
  readonly className?: string;
  readonly hint?: ReactNode;
  readonly label: ReactNode;
  readonly name: string;
}

/** Label, control and hint; the control is marked invalid after a failed save. */
const FieldShell = ({
  children,
  className,
  hint,
  label,
  name,
}: FieldShellProps) => {
  const id = useId();
  const { invalid } = useFormContext();
  const isInvalid = invalid(name.replace("[]", ""));

  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label className={cn(isInvalid && "text-destructive")} htmlFor={id}>
        {label}
      </Label>
      {children(id, isInvalid)}
      {hint ? (
        <p className="text-muted-foreground text-xs" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
};

type TextFieldProps = Omit<ComponentProps<typeof Input>, "id" | "name"> & {
  readonly hint?: ReactNode;
  readonly label: ReactNode;
  readonly name: string;
  readonly wrapperClassName?: string;
};

export const TextField = ({
  hint,
  label,
  name,
  wrapperClassName,
  ...props
}: TextFieldProps) => (
  <FieldShell
    className={wrapperClassName}
    hint={hint}
    label={label}
    name={name}
  >
    {(id, invalid) => (
      <Input
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-invalid={invalid || undefined}
        id={id}
        name={name}
        {...props}
      />
    )}
  </FieldShell>
);

type TextareaFieldProps = Omit<
  ComponentProps<typeof Textarea>,
  "id" | "name"
> & {
  readonly hint?: ReactNode;
  readonly label: ReactNode;
  readonly name: string;
  readonly wrapperClassName?: string;
};

export const TextareaField = ({
  hint,
  label,
  name,
  wrapperClassName,
  ...props
}: TextareaFieldProps) => (
  <FieldShell
    className={wrapperClassName}
    hint={hint}
    label={label}
    name={name}
  >
    {(id, invalid) => (
      <Textarea
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-invalid={invalid || undefined}
        id={id}
        name={name}
        {...props}
      />
    )}
  </FieldShell>
);

export interface Option {
  label: string;
  value: string;
}

const selectClassName =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground";

/** A native select styled like the inputs (works in plain and GET forms). */
export const NativeSelect = ({
  className,
  options,
  ...props
}: Omit<ComponentProps<"select">, "children"> & {
  readonly options: Option[];
}) => (
  <select className={cn(selectClassName, className)} {...props}>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

type SelectFieldProps = Omit<
  ComponentProps<"select">,
  "id" | "name" | "children"
> & {
  readonly hint?: ReactNode;
  readonly label: ReactNode;
  readonly name: string;
  readonly options: Option[];
  readonly wrapperClassName?: string;
};

export const SelectField = ({
  hint,
  label,
  name,
  options,
  wrapperClassName,
  ...props
}: SelectFieldProps) => (
  <FieldShell
    className={wrapperClassName}
    hint={hint}
    label={label}
    name={name}
  >
    {(id, invalid) => (
      <NativeSelect
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-invalid={invalid || undefined}
        id={id}
        name={name}
        options={options}
        {...props}
      />
    )}
  </FieldShell>
);

type CheckboxFieldProps = Omit<ComponentProps<"input">, "id" | "type"> & {
  readonly hint?: ReactNode;
  readonly label: ReactNode;
  readonly name: string;
};

/** A checkbox; the action reads it with the `checkbox` schema. */
export const CheckboxField = ({
  className,
  hint,
  label,
  name,
  ...props
}: CheckboxFieldProps) => {
  const id = useId();

  return (
    <div className={cn("flex items-start gap-2", className)}>
      <input
        className="mt-0.5 size-4 shrink-0 accent-primary"
        id={id}
        name={name}
        type="checkbox"
        {...props}
      />
      <div className="grid gap-1">
        <Label htmlFor={id}>{label}</Label>
        {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      </div>
    </div>
  );
};

/** Lays fields out in responsive columns. */
export const FieldGrid = ({
  children,
  className,
  columns = 2,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly columns?: 2 | 3 | 4;
}) => (
  <div
    className={cn(
      "grid gap-4",
      columns === 2 && "sm:grid-cols-2",
      columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "sm:grid-cols-2 lg:grid-cols-4",
      className
    )}
  >
    {children}
  </div>
);
