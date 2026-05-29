"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig } from "@/lib/supabase/config";
import { assertAdminSession } from "@/lib/supabase/staff-admin";
import type { UserRole } from "@/lib/types";

const validRoles: UserRole[] = ["admin", "frontdesk", "coach"];

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeRole(value: FormDataEntryValue | null): UserRole | null {
  const role = String(value ?? "").trim() as UserRole;
  return validRoles.includes(role) ? role : null;
}

function normalizeAccount(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function accountToEmail(account: string) {
  return account === "admin" ? "admin@swimops.local" : `${account}@swimops.local`;
}

function buildProfilePayload(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const account = normalizeAccount(formData.get("account"));
  const role = normalizeRole(formData.get("role"));
  const campus = emptyToNull(formData.get("campus"));
  const rawCoachName = emptyToNull(formData.get("coachName"));
  const password = String(formData.get("password") ?? "");

  if (!fullName) {
    return { ok: false as const, message: "请输入员工姓名" };
  }

  if (!account) {
    return { ok: false as const, message: "请输入登录账号" };
  }

  if (!role) {
    return { ok: false as const, message: "请选择有效角色" };
  }

  if (role === "admin" && account !== "admin") {
    return { ok: false as const, message: "管理员账号只能是唯一的 admin" };
  }

  if (role === "coach" && !account.startsWith("jl")) {
    return { ok: false as const, message: "教练账号必须以 jl 开头" };
  }

  if (role === "frontdesk" && !account.startsWith("qt")) {
    return { ok: false as const, message: "前台账号必须以 qt 开头" };
  }

  const coachName = role === "coach" ? rawCoachName : null;
  if (role === "coach" && !coachName) {
    return { ok: false as const, message: "教练账号必须填写教练名称，并与排课中的教练字段一致" };
  }

  if (password && password.length < 4) {
    return { ok: false as const, message: "密码至少需要 4 位" };
  }

  return {
    ok: true as const,
    payload: {
      account,
      email: accountToEmail(account),
      fullName,
      role,
      campus,
      coachName,
      password
    }
  };
}

export async function createStaffAccountAction(formData: FormData) {
  try {
    await assertAdminSession();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  if (!hasSupabaseAdminConfig()) {
    return { ok: false, message: "当前环境未配置 SUPABASE_SERVICE_ROLE_KEY，无法在网页中管理账号" };
  }

  const parsed = buildProfilePayload(formData);
  if (!parsed.ok) return parsed;

  if (!parsed.payload.password) {
    return { ok: false, message: "创建账号时必须填写初始密码" };
  }

  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email: parsed.payload.email,
    password: parsed.payload.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.payload.fullName,
      account: parsed.payload.account
    }
  });

  if (created.error || !created.data.user) {
    return { ok: false, message: created.error?.message ?? "创建账号失败" };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: created.data.user.id,
    full_name: parsed.payload.fullName,
    role: parsed.payload.role,
    campus: parsed.payload.campus,
    coach_name: parsed.payload.coachName,
    updated_at: new Date().toISOString()
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.data.user.id).catch(() => undefined);
    return { ok: false, message: profileError.message };
  }

  revalidatePath("/staff");
  return { ok: true, message: "员工账号已创建" };
}

export async function updateStaffAccountAction(userId: string, formData: FormData) {
  try {
    await assertAdminSession();
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  if (!hasSupabaseAdminConfig()) {
    return { ok: false, message: "当前环境未配置 SUPABASE_SERVICE_ROLE_KEY，无法在网页中管理账号" };
  }

  const parsed = buildProfilePayload(formData);
  if (!parsed.ok) return parsed;

  const admin = createAdminClient();
  const authPayload: {
    email: string;
    user_metadata: { full_name: string; account: string };
    password?: string;
  } = {
    email: parsed.payload.email,
    user_metadata: {
      full_name: parsed.payload.fullName,
      account: parsed.payload.account
    }
  };

  if (parsed.payload.password) {
    authPayload.password = parsed.payload.password;
  }

  const updated = await admin.auth.admin.updateUserById(userId, authPayload);
  if (updated.error) {
    return { ok: false, message: updated.error.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: parsed.payload.fullName,
      role: parsed.payload.role,
      campus: parsed.payload.campus,
      coach_name: parsed.payload.coachName,
      updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  revalidatePath("/staff");
  revalidatePath("/coach/today");
  revalidatePath("/schedule");
  revalidatePath("/members");
  return { ok: true, message: "员工账号已更新" };
}

export async function deleteStaffAccountAction(userId: string) {
  let currentUserId = "";
  try {
    const user = await assertAdminSession();
    currentUserId = user.id;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "无权限操作" };
  }

  if (!hasSupabaseAdminConfig()) {
    return { ok: false, message: "当前环境未配置 SUPABASE_SERVICE_ROLE_KEY，无法在网页中管理账号" };
  }

  if (userId === currentUserId) {
    return { ok: false, message: "不能删除当前登录的管理员账号" };
  }

  const admin = createAdminClient();
  const deleted = await admin.auth.admin.deleteUser(userId);
  if (deleted.error) {
    return { ok: false, message: deleted.error.message };
  }

  revalidatePath("/staff");
  return { ok: true, message: "员工账号已删除" };
}
