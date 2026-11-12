import type { ServiceStatus } from "./types";

// Keep established database/API values; use consistent customer-facing wording.
export const serviceStatusLabel: Record<ServiceStatus, string> = {
  Active: "Published",
  Draft: "Draft",
  Paused: "Unpublished",
};
