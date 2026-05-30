import type { Member, ProductType } from "@/lib/types";

export function makeLocalId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function calculateMemberStatus(productType: ProductType, totalLessons: number, usedLessons: number): Member["status"] {
  if (productType !== "class_pack") {
    return "正常";
  }

  const remaining = totalLessons - usedLessons;
  if (remaining < 0) return "欠课";
  if (remaining === 0) return "已完成";
  if (remaining <= 5) return "即将用完";
  return "正常";
}
