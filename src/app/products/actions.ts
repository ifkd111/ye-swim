"use server";

import { revalidatePath } from "next/cache";
import { requireAdminViewer } from "@/lib/authz";
import { clearDataCache } from "@/lib/data-source";
import { createClient } from "@/lib/supabase/server";
import type { ProductType } from "@/lib/types";

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function productPayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    type: String(formData.get("type") ?? "class_pack") as ProductType,
    total_lessons: Number(formData.get("totalLessons") || 0),
    valid_days: emptyToNull(formData.get("validDays")) ? Number(formData.get("validDays")) : null,
    price: Number(formData.get("price") || 0),
    notes: emptyToNull(formData.get("notes"))
  };
}

export async function createProductAction(formData: FormData) {
  try {
    await requireAdminViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  const payload = productPayload(formData);
  if (!payload.name) return { ok: false, message: "请输入产品名称" };

  const supabase = await createClient();
  const { error } = await supabase.from("course_products").insert(payload);
  if (error) return { ok: false, message: error.message };

  clearDataCache();
  revalidatePath("/products");
  revalidatePath("/student");
  return { ok: true, message: "课程产品已创建" };
}

export async function updateProductAction(productId: string, formData: FormData) {
  try {
    await requireAdminViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  const payload = productPayload(formData);
  if (!payload.name) return { ok: false, message: "请输入产品名称" };

  const supabase = await createClient();
  const { error } = await supabase.from("course_products").update(payload).eq("id", productId);
  if (error) return { ok: false, message: error.message };

  clearDataCache();
  revalidatePath("/products");
  revalidatePath("/student");
  return { ok: true, message: "课程产品已更新" };
}
