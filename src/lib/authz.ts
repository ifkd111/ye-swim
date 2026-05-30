import { createClient } from "@/lib/supabase/server";
import { accountFromEmail, normalizeAccount, roleFromAccount } from "@/lib/account-role";
import type { UserRole } from "@/lib/types";

export type ViewerProfile = {
  userId: string;
  role: UserRole;
  fullName: string;
  coachName: string | null;
  memberId: string | null;
};

function isRole(value: unknown): value is UserRole {
  return value === "admin" || value === "frontdesk" || value === "coach" || value === "student";
}

export async function getViewerProfile(): Promise<ViewerProfile | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  const metadata = user.user_metadata ?? {};
  const account =
    normalizeAccount(data?.account) ||
    normalizeAccount(metadata.account) ||
    accountFromEmail(user.email);
  const role = roleFromAccount(account) ?? (isRole(data?.role) ? data.role : isRole(metadata.role) ? metadata.role : null);
  if (error || !role) return null;

  return {
    userId: user.id,
    role,
    fullName: typeof data?.full_name === "string" ? data.full_name : typeof metadata.full_name === "string" ? metadata.full_name : "",
    coachName: typeof data?.coach_name === "string" ? data.coach_name : null,
    memberId: typeof data?.member_id === "string" ? data.member_id : null
  };
}

export async function requireAdminViewer() {
  const viewer = await getViewerProfile();
  if (!viewer || (viewer.role !== "admin" && viewer.role !== "frontdesk")) {
    throw new Error("无权限操作");
  }
  return viewer;
}

export async function requireCoachViewer() {
  const viewer = await getViewerProfile();
  if (!viewer || viewer.role !== "coach" || !viewer.coachName) {
    throw new Error("请使用教练账号登录");
  }
  return viewer;
}

export async function requireStudentViewer() {
  const viewer = await getViewerProfile();
  if (!viewer || viewer.role !== "student" || !viewer.memberId) {
    throw new Error("请使用已绑定学员的账号登录");
  }
  return viewer;
}
