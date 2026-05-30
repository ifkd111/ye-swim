"use server";

import { redirect } from "next/navigation";
import { accountEmail, accountHomePath, roleFromAccount } from "@/lib/account-role";
import { createClient } from "@/lib/supabase/server";

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function normalizeNextPath(value: FormDataEntryValue | null) {
  const path = String(value ?? "").trim();
  if (!path) return "/dashboard";
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}

function loginErrorUrl(message: string, nextPath: string) {
  const params = new URLSearchParams({
    error: message
  });

  if (nextPath !== "/dashboard") {
    params.set("next", nextPath);
  }

  return `/login?${params.toString()}`;
}

function mappedPassword(account: string, password: string) {
  if (password !== "1324") {
    return password;
  }

  if (account === "admin") {
    return process.env.DEMO_ADMIN_PASSWORD || password;
  }

  if (account.startsWith("jl")) {
    return process.env.DEMO_COACH_PASSWORD || password;
  }

  if (account.startsWith("xy")) {
    return process.env.DEMO_STUDENT_PASSWORD || password;
  }

  return password;
}

function fallbackPasswords(account: string, password: string) {
  const primary = mappedPassword(account, password);
  const fallbacks = [primary];

  if (account === "admin" && password === "1324" && primary !== "132400") {
    fallbacks.push("132400");
  }

  if (account.startsWith("jl") && password === "1324" && primary !== "132400") {
    fallbacks.push("132400");
  }

  if (account.startsWith("xy") && password === "1324" && primary !== "132400") {
    fallbacks.push("132400");
  }

  return fallbacks;
}

export async function login(formData: FormData) {
  const quickAccount = String(formData.get("quickAccount") ?? "").trim().toLowerCase();
  const account = (quickAccount || String(formData.get("account") ?? "")).trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = normalizeNextPath(formData.get("next"));

  if (!hasSupabaseConfig()) {
    if (account === "admin" && password === "1324") {
      redirect(nextPath);
    }

    redirect(loginErrorUrl("账号或密码错误", nextPath));
  }

  if (!account) {
    redirect(loginErrorUrl("请输入账号", nextPath));
  }

  const accountRole = roleFromAccount(account);
  if (!accountRole) {
    redirect(loginErrorUrl("账号格式不正确，请使用 admin / jl开头 / xy开头", nextPath));
  }

  const email = accountEmail(account);

  if (!email.includes("@")) {
    redirect(loginErrorUrl("账号格式不正确", nextPath));
  }

  const supabase = await createClient();
  let loginError: unknown = null;
  for (const passwordToUse of fallbackPasswords(account, password)) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwordToUse
    });

    loginError = error;
    if (!error) {
      loginError = null;
      break;
    }
  }

  if (loginError) {
    redirect(loginErrorUrl("账号或密码错误", nextPath));
  }

  const fallbackPath = accountHomePath(account);

  redirect(nextPath === "/dashboard" ? fallbackPath : nextPath);
}

export async function logout() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
