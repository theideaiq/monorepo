import type { Database } from "@repo/database";
import type { Tone } from "@/components/admin/status-badge";

type Enums = Database["public"]["Enums"];

export const requestTone: Record<Enums["procurement_status"], Tone> = {
  cancelled: "neutral",
  delivered: "success",
  ordered: "info",
  quoted: "warning",
  submitted: "danger",
};

export const quoteTone: Record<Enums["quote_status"], Tone> = {
  accepted: "success",
  declined: "neutral",
  draft: "warning",
  sent: "info",
  withdrawn: "neutral",
};

export const orderTone: Record<Enums["purchase_order_status"], Tone> = {
  cancelled: "neutral",
  delivered: "success",
  open: "info",
};

export const invoiceTone: Record<Enums["invoice_status"], Tone> = {
  issued: "warning",
  paid: "success",
  void: "neutral",
};

export const seatTone: Record<Enums["plus_seat_status"], Tone> = {
  active: "success",
  declined: "neutral",
  ended: "neutral",
  requested: "danger",
};

export const jobTone: Record<Enums["job_status"], Tone> = {
  closed: "neutral",
  filled: "success",
  open: "info",
};

export const candidateTone: Record<Enums["candidate_status"], Tone> = {
  hired: "success",
  proposed: "warning",
  rejected: "neutral",
  shortlisted: "info",
  withdrawn: "neutral",
};
