"use server";

import { revalidatePath } from "next/cache";
import { requireAdminViewer, getViewerProfile } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

export async function createAvailabilitySlotAction(formData: FormData) {
  const supabase = await createClient();
  const viewer = await getViewerProfile();

  if (!viewer || (viewer.role !== "admin" && viewer.role !== "frontdesk" && viewer.role !== "coach")) {
    return { ok: false, message: "无权限操作" };
  }

  const coach =
    viewer.role === "coach"
      ? viewer.coachName
      : String(formData.get("coach") ?? "").trim() || null;
  const status = viewer.role === "coach" ? "draft" : String(formData.get("status") ?? "draft");

  if (!coach) return { ok: false, message: "请填写教练" };

  const payload = {
    slot_date: String(formData.get("slotDate") ?? ""),
    slot_time: String(formData.get("slotTime") ?? ""),
    campus: String(formData.get("campus") ?? "").trim(),
    coach,
    capacity: Number(formData.get("capacity") || 1),
    status,
    publish_order: Number(formData.get("publishOrder") || 100),
    notes: emptyToNull(formData.get("notes")),
    created_by: viewer.userId
  };

  if (!payload.slot_date || !payload.slot_time || !payload.campus) {
    return { ok: false, message: "请填写日期、时间和校区" };
  }

  const { error } = await supabase.from("coach_availability_slots").insert(payload);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/availability");
  revalidatePath("/student");
  return { ok: true, message: viewer.role === "coach" ? "空余时间已提交，等待管理员发布" : "空余时间已保存" };
}

export async function updateAvailabilitySlotAction(slotId: string, formData: FormData) {
  const viewer = await getViewerProfile();
  const supabase = await createClient();

  if (!viewer || (viewer.role !== "admin" && viewer.role !== "frontdesk" && viewer.role !== "coach")) {
    return { ok: false, message: "无权限操作" };
  }

  const payload =
    viewer.role === "coach"
      ? {
          slot_date: String(formData.get("slotDate") ?? ""),
          slot_time: String(formData.get("slotTime") ?? ""),
          campus: String(formData.get("campus") ?? "").trim(),
          coach: viewer.coachName,
          capacity: Number(formData.get("capacity") || 1),
          status: "draft",
          notes: emptyToNull(formData.get("notes")),
          updated_at: new Date().toISOString()
        }
      : {
          slot_date: String(formData.get("slotDate") ?? ""),
          slot_time: String(formData.get("slotTime") ?? ""),
          campus: String(formData.get("campus") ?? "").trim(),
          coach: String(formData.get("coach") ?? "").trim(),
          capacity: Number(formData.get("capacity") || 1),
          status: String(formData.get("status") ?? "draft"),
          publish_order: Number(formData.get("publishOrder") || 100),
          notes: emptyToNull(formData.get("notes")),
          updated_at: new Date().toISOString()
        };

  const { error } = await supabase.from("coach_availability_slots").update(payload).eq("id", slotId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/availability");
  revalidatePath("/student");
  return { ok: true, message: "空余时间已更新" };
}

export async function publishAvailabilitySlotAction(slotId: string) {
  try {
    await requireAdminViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("coach_availability_slots")
    .update({ status: "published", updated_at: new Date().toISOString() })
    .eq("id", slotId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/availability");
  revalidatePath("/student");
  return { ok: true, message: "已发布给学员预约" };
}

export async function closeAvailabilitySlotAction(slotId: string) {
  try {
    await requireAdminViewer();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("coach_availability_slots")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", slotId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/availability");
  revalidatePath("/student");
  return { ok: true, message: "已关闭该时间" };
}

export async function deleteAvailabilitySlotAction(slotId: string) {
  const viewer = await getViewerProfile();
  if (!viewer || (viewer.role !== "admin" && viewer.role !== "frontdesk" && viewer.role !== "coach")) {
    return { ok: false, message: "无权限操作" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("coach_availability_slots").delete().eq("id", slotId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/availability");
  revalidatePath("/student");
  return { ok: true, message: "空余时间已删除" };
}
