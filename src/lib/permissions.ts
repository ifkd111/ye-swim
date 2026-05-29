import type { DataMode } from "@/lib/data-source";
import type { UserRole } from "@/lib/types";

export function canManageMembers(role: UserRole | null, dataMode: DataMode) {
  return dataMode === "demo" || role === "admin" || role === "frontdesk";
}

export function canManageSchedules(role: UserRole | null, dataMode: DataMode) {
  return dataMode === "demo" || role === "admin" || role === "frontdesk";
}

export function canManageStaff(role: UserRole | null) {
  return role === "admin";
}

export function getRoleLabel(role: UserRole | null) {
  if (role === "admin") return "管理员";
  if (role === "frontdesk") return "前台";
  if (role === "coach") return "教练";
  return "访客";
}
