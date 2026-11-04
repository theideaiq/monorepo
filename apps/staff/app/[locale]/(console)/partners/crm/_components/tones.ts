import type { Tone } from "@/components/admin/status-badge";
import type {
  DealStage,
  DueState,
  PartnerStage,
  Priority,
} from "@/lib/admin/partner-crm";

export const stageTones: Record<PartnerStage, Tone> = {
  contacted: "info",
  declined: "neutral",
  partner: "success",
  paused: "neutral",
  prospect: "neutral",
  talking: "brand",
};

export const priorityTones: Record<Priority, Tone> = {
  1: "warning",
  2: "neutral",
  3: "neutral",
};

export const dueTones: Record<DueState, Tone> = {
  overdue: "danger",
  today: "warning",
  upcoming: "neutral",
};

export const dealStageTones: Record<DealStage, Tone> = {
  agreed: "success",
  done: "success",
  idea: "neutral",
  lost: "neutral",
  negotiating: "warning",
  proposed: "info",
};
