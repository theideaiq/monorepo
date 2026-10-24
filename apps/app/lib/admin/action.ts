import "server-only";

import { refresh } from "next/cache";
import type { z } from "zod";
import {
  type ActionError,
  type ActionState,
  databaseError,
  failure,
  success,
} from "./action-state";
import { formObject } from "./forms";
import { type AccessLevel, accessTo, type Section } from "./roles";
import { getSession, type ServerClient, type StaffMember } from "./session";

export interface ActionContext<Input> {
  input: Input;
  staff: StaffMember;
  supabase: ServerClient;
}

/** Thrown inside a handler to answer with an error key. */
export class ActionFailure extends Error {
  readonly key: ActionError;

  constructor(key: ActionError) {
    super(key);
    this.key = key;
  }
}

/** Throws the mapped error when a Supabase call failed. */
export const check = <
  T extends { error: { code?: string; message?: string } | null },
>(
  result: T
): T => {
  if (result.error) {
    throw new ActionFailure(databaseError(result.error));
  }
  return result;
};

/**
 * Like `check`, for updates and deletes run with `.select()`: RLS hides rows
 * the role may not change, so "no rows" means not found (or not allowed).
 */
export const affected = <
  T extends {
    data: unknown[] | null;
    error: { code?: string; message?: string } | null;
  },
>(
  result: T
): T => {
  check(result);
  if (!result.data || result.data.length === 0) {
    throw new ActionFailure("notFound");
  }
  return result;
};

/**
 * Wraps a Server Action used with `useActionState`. Every call re-checks the
 * session (signed in, staff, AAL2) and the role's access to the section,
 * validates the form with zod, and runs the handler with the session-bound
 * client, so Row Level Security applies to every query. The page is
 * re-rendered after a successful change.
 */
export const staffAction =
  <Schema extends z.ZodType>(
    section: Section,
    schema: Schema,
    handler: (
      context: ActionContext<z.output<Schema>>
    ) => Promise<ActionState | undefined>,
    level: AccessLevel = "write"
  ) =>
  async (_previous: ActionState, formData: FormData): Promise<ActionState> => {
    const session = await getSession();

    if (session.status !== "ready") {
      return failure("unauthorized");
    }

    const access = accessTo(session.staff.role, section);
    if (!access || (level === "write" && access !== "write")) {
      return failure("forbidden");
    }

    const parsed = schema.safeParse(formObject(formData));
    if (!parsed.success) {
      return failure(
        "invalid",
        parsed.error.issues.map((issue) => issue.path.join("."))
      );
    }

    try {
      const result = await handler({
        input: parsed.data,
        staff: session.staff,
        supabase: session.supabase,
      });
      refresh();
      return result ?? success();
    } catch (error) {
      if (error instanceof ActionFailure) {
        return failure(error.key);
      }
      throw error;
    }
  };
