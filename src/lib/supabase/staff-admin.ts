import { redirect } from "next/navigation";
import { accountFromEmail, normalizeAccount, roleFromAccount } from "@/lib/account-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasSupabaseAdminConfig, hasSupabaseBrowserConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

type ProfileRow = {
  id: string;
  full_name: string;
  role: UserRole;
  account: string | null;
  campus: string | null;
  coach_name: string | null;
  remark_name: string | null;
  member_id: string | null;
  created_at: string;
  updated_at: string;
};

type AuthUserRow = {
  id: string;
  email?: string | null;
  last_sign_in_at?: string | null;
  created_at?: string;
};

export type StaffAccount = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  account: string | null;
  campus: string | null;
  coachName: string | null;
  remarkName: string | null;
  memberId: string | null;
  memberName: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  isCurrentUser: boolean;
};

function userRoleFromMetadata(value: unknown): UserRole | null {
  if (value === "admin" || value === "frontdesk" || value === "coach" || value === "student") {
    return value;
  }
  return null;
}

function isMissingSchema(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "42703" || error?.code === "42P01" || error?.message?.includes("does not exist");
}

export async function assertAdminSession() {
  if (!hasSupabaseBrowserConfig()) {
    throw new Error("Supabase is not configured");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in again");
  }

  const account = normalizeAccount(user.user_metadata?.account) || accountFromEmail(user.email);
  const role = roleFromAccount(account) ?? userRoleFromMetadata(user.user_metadata?.role);
  if (role !== "admin") {
    throw new Error("Only admins can manage staff accounts");
  }

  return user;
}

export async function requireAdminPageAccess() {
  try {
    return await assertAdminSession();
  } catch (error) {
    if (error instanceof Error && error.message === "Please sign in again") {
      redirect("/login?next=%2Fstaff");
    }

    redirect("/dashboard");
  }
}

export async function listStaffAccounts(): Promise<{
  accounts: StaffAccount[];
  currentUserId: string;
  hasAdminRuntime: boolean;
}> {
  const currentUser = await requireAdminPageAccess();

  if (!hasSupabaseAdminConfig()) {
    return {
      accounts: [],
      currentUserId: currentUser.id,
      hasAdminRuntime: false
    };
  }

  const admin = createAdminClient();
  const usersResult = await admin.auth.admin.listUsers();
  let { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("*, members(chinese_name)")
    .order("created_at", { ascending: true });

  if (profilesError && isMissingSchema(profilesError)) {
    const fallback = await admin.from("profiles").select("*").order("created_at", { ascending: true });
    profiles = fallback.data;
    profilesError = fallback.error;
  }

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (usersResult.error) {
    throw new Error(usersResult.error.message);
  }

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as ProfileRow]));
  const accounts: StaffAccount[] = [];

  for (const user of usersResult.data.users) {
    const authUser = user as AuthUserRow;
    const profile = profileMap.get(user.id);

    if (!profile) continue;

    accounts.push({
      id: user.id,
      email: authUser.email ?? "",
      fullName: profile.full_name,
      role: profile.role,
      account: profile.account,
      campus: profile.campus,
      coachName: profile.coach_name,
      remarkName: profile.remark_name ?? null,
      memberId: profile.member_id,
      memberName: (profile as any).members?.chinese_name ?? null,
      createdAt: authUser.created_at ?? profile.created_at ?? null,
      lastSignInAt: authUser.last_sign_in_at ?? null,
      isCurrentUser: user.id === currentUser.id
    });
  }

  accounts.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));

  return {
    accounts,
    currentUserId: currentUser.id,
    hasAdminRuntime: true
  };
}
