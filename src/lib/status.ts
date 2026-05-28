import type { Member, ProductType } from "@/lib/types";

export function getStatusTone(status: Member["status"]) {
  if (status === "欠课") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (status === "即将用完") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function getProductTypeLabel(type: ProductType) {
  const labels: Record<ProductType, string> = {
    class_pack: "次卡",
    monthly: "月卡",
    camp: "集训",
    vip: "VIP"
  };

  return labels[type];
}

export function compactDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(`${date}T00:00:00`));
}

export function fullDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(new Date(`${date}T00:00:00`));
}
