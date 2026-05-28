"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

async function productIdForType(type: string, explicitProductId: string | null) {
  if (explicitProductId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(explicitProductId)) {
    return explicitProductId;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("course_products").select("id").eq("type", type).limit(1).single();
  if (error) throw error;
  return data.id as string;
}

export async function createMemberAction(formData: FormData) {
  const supabase = await createClient();
  const productType = String(formData.get("productType") ?? "class_pack");
  const productId = await productIdForType(productType, emptyToNull(formData.get("productId")));

  const payload = {
    chinese_name: String(formData.get("name") ?? "").trim(),
    english_name: emptyToNull(formData.get("englishName")),
    gender: emptyToNull(formData.get("gender")),
    phone: emptyToNull(formData.get("phone")),
    wechat: emptyToNull(formData.get("wechat")),
    campus: emptyToNull(formData.get("campus")),
    coach: emptyToNull(formData.get("coach")) ?? "未分配",
    product_id: productId,
    total_lessons: Number(formData.get("totalLessons") || 20),
    card_start_date: emptyToNull(formData.get("cardStartDate")),
    card_expire_date: emptyToNull(formData.get("cardExpireDate")),
    notes: emptyToNull(formData.get("notes"))
  };

  if (!payload.chinese_name) {
    return { ok: false, message: "请输入学员姓名" };
  }

  const { error } = await supabase.from("members").insert(payload);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/members");
  revalidatePath("/dashboard");
  return { ok: true, message: "学员已保存" };
}

export async function updateMemberAction(memberId: string, formData: FormData) {
  const supabase = await createClient();
  const productType = String(formData.get("productType") ?? "class_pack");
  const productId = await productIdForType(productType, emptyToNull(formData.get("productId")));

  const payload = {
    chinese_name: String(formData.get("name") ?? "").trim(),
    english_name: emptyToNull(formData.get("englishName")),
    gender: emptyToNull(formData.get("gender")),
    phone: emptyToNull(formData.get("phone")),
    wechat: emptyToNull(formData.get("wechat")),
    campus: emptyToNull(formData.get("campus")),
    coach: emptyToNull(formData.get("coach")) ?? "未分配",
    product_id: productId,
    total_lessons: Number(formData.get("totalLessons") || 20),
    card_start_date: emptyToNull(formData.get("cardStartDate")),
    card_expire_date: emptyToNull(formData.get("cardExpireDate")),
    notes: emptyToNull(formData.get("notes")),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from("members").update(payload).eq("id", memberId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/members");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  return { ok: true, message: "学员已更新" };
}

export async function deleteMemberAction(memberId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/members");
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/attendance");
  return { ok: true, message: "学员已删除" };
}
