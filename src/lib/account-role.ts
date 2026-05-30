import type { UserRole } from "@/lib/types";

export function normalizeAccount(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function roleFromAccount(account: string): UserRole | null {
  const normalized = normalizeAccount(account);

  if (normalized === "admin") return "admin";
  if (normalized.startsWith("jl")) return "coach";
  if (normalized.startsWith("xy")) return "student";

  return null;
}

export function accountEmail(account: string) {
  const normalized = normalizeAccount(account);
  if (normalized === "admin") return "admin@swimops.local";
  if (roleFromAccount(normalized)) return `${normalized}@swimops.local`;
  return normalized;
}

export function accountHomePath(account: string) {
  const role = roleFromAccount(account);
  if (role === "coach") return "/coach/today";
  if (role === "student") return "/student";
  return "/dashboard";
}

export function accountFromEmail(email: string | null | undefined) {
  const normalized = normalizeAccount(email);
  return normalized.endsWith("@swimops.local") ? normalized.replace(/@swimops\.local$/i, "") : normalized;
}
