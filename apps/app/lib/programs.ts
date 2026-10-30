"use client";

import { useAuth } from "@repo/auth/provider";
import { uploadProgramDocument } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/**
 * The IDEA's paid programs (migration `20270305000000_programs.sql`):
 * applying with passport scans, a minor's guardian approving, paying each
 * installment through the cart and withdrawing.
 */

export type ApplicationStatus =
  | "accepted"
  | "cancelled"
  | "completed"
  | "confirmed"
  | "refused"
  | "submitted"
  | "waitlisted"
  | "withdrawn";

export interface ProgramPayment {
  amount: number;
  due_on: string;
  /** The order paying it, while that order is open or paid. */
  order: { status: string } | null;
  paid_at: string | null;
  position: number;
}

export interface MyApplication {
  cancel_reason: string | null;
  created_at: string;
  guardian_status: string | null;
  id: string;
  passport_files: string[];
  pay_by: string | null;
  payments: ProgramPayment[];
  price: number | null;
  program: {
    opportunity: {
      slug: string;
      starts_on: string | null;
      title_ar: string;
      title_en: string;
    } | null;
  } | null;
  program_id: string;
  refund_amount: number | null;
  refunded_at: string | null;
  review_note: string | null;
  status: ApplicationStatus;
}

const APPLICATION_COLUMNS =
  "id, program_id, status, guardian_status, price, pay_by, review_note, cancel_reason, refund_amount, refunded_at, passport_files, created_at, payments:program_payments (position, amount, due_on, paid_at, order:orders (status)), program:programs (opportunity:opportunities (slug, title_ar, title_en, starts_on))" as const;

/** Applications that are still going (not refused, withdrawn or cancelled). */
export const isLive = (status: ApplicationStatus) =>
  !["refused", "withdrawn", "cancelled"].includes(status);

/** What's left to pay: the unpaid installments, in order. */
export const unpaid = (application: Pick<MyApplication, "payments">) =>
  [...application.payments]
    .filter((payment) => !payment.paid_at)
    .sort((a, b) => a.position - b.position);

/** An unpaid installment that isn't waiting in an order already. */
export const payable = (payment: ProgramPayment) =>
  !(
    payment.paid_at ||
    (payment.order && !["cancelled", "refunded"].includes(payment.order.status))
  );

const applicationsKey = (userId: string) => ["programs", "mine", userId];

/** The member's applications, newest first. */
export const useMyApplications = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(
        await supabase
          .from("program_applications")
          .select(APPLICATION_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
      ) ?? []) as unknown as MyApplication[],
    queryKey: applicationsKey(user?.id ?? ""),
  });
};

/** The member's latest application to one program, if any. */
export const useMyApplication = (programId: string) => {
  const applications = useMyApplications();
  return {
    ...applications,
    data:
      applications.data?.find((row) => row.program_id === programId) ?? null,
  };
};

export interface ApplyInput {
  emergencyName: string;
  emergencyPhone: string;
  files: File[];
  motivation: string;
  programId: string;
}

/** Uploads the passport scans to the member's folder, then applies. */
export const useApplyToProgram = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ApplyInput) => {
      const userId = requireUserId(user?.id);
      const stored = await Promise.all(
        input.files.map((file) =>
          uploadProgramDocument(supabase, userId, input.programId, file)
        )
      );
      return unwrap(
        await supabase.rpc("apply_to_program", {
          emergency_name: input.emergencyName,
          emergency_phone: input.emergencyPhone,
          motivation: input.motivation || undefined,
          passport_files: stored.map((file) => file.path),
          program: input.programId,
        })
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: applicationsKey(user?.id ?? ""),
      }),
  });
};

/** Withdraws before the program starts; returns the refund due. */
export const useWithdrawApplication = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (application: string) =>
      unwrap(
        await supabase.rpc("withdraw_program_application", { application })
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: applicationsKey(user?.id ?? ""),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.cart(user?.id ?? ""),
        }),
      ]),
  });
};

// ── In the cart ──────────────────────────────────────────────────────────

export interface CartProgram {
  application: MyApplication | null;
  application_id: string;
  pay_in_full: boolean;
}

const cartProgramsKey = (userId: string) => [
  ...queryKeys.cart(userId),
  "programs",
];

/** The installments waiting in the cart (`cart_programs`). */
export const useCartPrograms = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(
        await supabase
          .from("cart_programs")
          .select(
            `application_id, pay_in_full, application:program_applications (${APPLICATION_COLUMNS})`
          )
          .order("created_at")
      ) ?? []) as unknown as CartProgram[],
    queryKey: cartProgramsKey(user?.id ?? ""),
  });
};

/**
 * Puts an accepted application's next installment (or everything left) in
 * the cart, replacing it if it was there.
 */
export const usePayInstallment = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      application,
      everything,
    }: {
      application: string;
      everything: boolean;
    }) => {
      unwrap(
        await supabase
          .from("cart_programs")
          .delete()
          .eq("application_id", application)
      );
      unwrap(
        await supabase
          .from("cart_programs")
          .insert({ application_id: application, pay_in_full: everything })
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

export const useRemoveCartProgram = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (application: string) => {
      unwrap(
        await supabase
          .from("cart_programs")
          .delete()
          .eq("application_id", application)
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

/** A program line, priced for the cart and checkout (the server's quote decides). */
export interface ProgramLine {
  amount: number;
  applicationId: string;
  /** Installments paid by this line, e.g. [1] or [2, 3]. */
  positions: number[];
  title: { title_ar: string; title_en: string } | null;
  /** How many installments the application has. */
  total: number;
}

/**
 * The cart's program lines: the next unpaid installment not already in an
 * order, or everything left.
 */
export const useCartProgramLines = (): ProgramLine[] => {
  const rows = useCartPrograms().data ?? [];
  return rows.flatMap((row) => {
    if (!row.application) {
      return [];
    }
    const open = unpaid(row.application).filter(payable);
    const paying = row.pay_in_full ? open : open.slice(0, 1);
    if (paying.length === 0) {
      return [];
    }
    return [
      {
        amount: paying.reduce((sum, payment) => sum + payment.amount, 0),
        applicationId: row.application_id,
        positions: paying.map((payment) => payment.position),
        title: row.application.program?.opportunity ?? null,
        total: row.application.payments.length,
      },
    ];
  });
};

// ── Guardians ────────────────────────────────────────────────────────────

export interface TeenApplication {
  details: { full_name?: string } | null;
  id: string;
  program: {
    opportunity: { title_ar: string; title_en: string } | null;
  } | null;
}

const teenApplicationsKey = (userId: string) => ["programs", "teens", userId];

/** Teens' applications waiting for the guardian's yes. */
export const useTeenApplications = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(
        await supabase
          .from("program_applications")
          .select(
            "id, details, program:programs (opportunity:opportunities (title_ar, title_en))"
          )
          .eq("guardian_id", requireUserId(user?.id))
          .eq("guardian_status", "pending")
          .eq("status", "submitted")
          .order("created_at")
      ) ?? []) as unknown as TeenApplication[],
    queryKey: teenApplicationsKey(user?.id ?? ""),
  });
};

/** The guardian approves or declines a teen's application. */
export const useDecideTeenApplication = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      application,
      approve,
    }: {
      application: string;
      approve: boolean;
    }) =>
      unwrap(
        await supabase.rpc("decide_program_guardian", { application, approve })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: teenApplicationsKey(user?.id ?? ""),
      }),
  });
};
