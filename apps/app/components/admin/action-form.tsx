"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Spinner } from "@repo/design-system/components/ui/spinner";
import { cn } from "@repo/design-system/lib/utils";
import { useTranslations } from "next-intl";
import {
  type ComponentProps,
  createContext,
  type FormEvent,
  type ReactNode,
  startTransition,
  use,
  useActionState,
  useEffect,
  useRef,
} from "react";
import { toast } from "sonner";
import { type ActionState, idle } from "@/lib/admin/action-state";
import { useRouter } from "@/lib/admin/navigation";

export type FormAction = (
  previous: ActionState,
  formData: FormData
) => Promise<ActionState>;

interface FormContextValue {
  invalid: (name: string) => boolean;
  pending: boolean;
  state: ActionState;
}

const FormContext = createContext<FormContextValue>({
  invalid: () => false,
  pending: false,
  state: idle,
});

export const useFormContext = () => use(FormContext);

interface ActionFormProps
  extends Omit<ComponentProps<"form">, "action" | "onSubmit"> {
  readonly action: FormAction;
  readonly children: ReactNode;
  /** Called with the result of a successful submission. */
  readonly onSuccess?: (
    state: Extract<ActionState, { status: "success" }>
  ) => void;
  /** Clears the fields after a successful submission (e.g. "add" forms). */
  readonly resetOnSuccess?: boolean;
  /** Skip the toast (the form shows the result itself). */
  readonly silent?: boolean;
}

/**
 * A form bound to a Server Action (see `staffAction`). Shows the outcome as a
 * toast, marks invalid fields, follows `redirectTo` and keeps what was typed
 * when the action fails (React would otherwise reset the form).
 */
export const ActionForm = ({
  action,
  children,
  className,
  onSuccess,
  resetOnSuccess = false,
  silent = false,
  ...props
}: ActionFormProps) => {
  const t = useTranslations("admin");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, idle);

  const formRef = useRef<HTMLFormElement>(null);
  // The latest callbacks, so the effect below runs once per result only.
  const latest = useRef({ onSuccess, resetOnSuccess, router, silent, t });
  latest.current = { onSuccess, resetOnSuccess, router, silent, t };

  useEffect(() => {
    const { current } = latest;
    if (state.status === "success") {
      if (!current.silent) {
        toast.success(current.t(`notices.${state.notice}`));
      }
      if (current.resetOnSuccess) {
        formRef.current?.reset();
      }
      current.onSuccess?.(state);
      if (state.redirectTo) {
        current.router.push(state.redirectTo);
      }
    } else if (state.status === "error" && !current.silent) {
      toast.error(current.t(`errors.${state.error}`));
    }
  }, [state]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const { submitter } = event.nativeEvent as SubmitEvent;
    if (submitter instanceof HTMLButtonElement && submitter.name) {
      formData.set(submitter.name, submitter.value);
    }
    startTransition(() => formAction(formData));
  };

  const fields = state.status === "error" ? (state.fields ?? []) : [];
  const invalid = (name: string) =>
    fields.some((field) => field === name || field.startsWith(`${name}.`));

  return (
    <FormContext value={{ invalid, pending, state }}>
      <form
        className={cn("grid gap-4", className)}
        noValidate
        onSubmit={handleSubmit}
        ref={formRef}
        {...props}
      >
        {children}
      </form>
    </FormContext>
  );
};

/** The form's submit button; disabled with a spinner while pending. */
export const SubmitButton = ({
  children,
  disabled,
  ...props
}: ComponentProps<typeof Button>) => {
  const { pending } = useFormContext();

  return (
    <Button disabled={pending || disabled} type="submit" {...props}>
      {pending ? <Spinner /> : null}
      {children}
    </Button>
  );
};

/** The last error, shown inline (for forms that are long or silent). */
export const FormError = () => {
  const t = useTranslations("admin.errors");
  const { state } = useFormContext();

  if (state.status !== "error") {
    return null;
  }
  return (
    <p className="text-destructive text-sm" role="alert">
      {t(state.error)}
    </p>
  );
};
