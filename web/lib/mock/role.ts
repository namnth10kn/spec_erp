import type { MockRole } from "@/lib/types/wfh";

export const ROLE_STORAGE_KEY = "erp-mock-role";

export function getStoredRole(): MockRole {
  if (typeof window === "undefined") return "hr";
  const value = window.localStorage.getItem(ROLE_STORAGE_KEY);
  if (value === "hr" || value === "ceo" || value === "staff") return value;
  return "hr";
}

export function setStoredRole(role: MockRole) {
  window.localStorage.setItem(ROLE_STORAGE_KEY, role);
}
