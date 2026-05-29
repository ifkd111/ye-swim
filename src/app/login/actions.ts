"use server";

import { redirect } from "next/navigation";
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

function accountEmail(account: string) {
  const normalized = account.trim().toLowerCase();
  if (normalized === "admin") {
    return "admin@swimops.local";
  }

  if (normalized.startsWith("jl") || normalized.startsWith("qt")) {
    return `${normalized}@swimops.local`;
  }

  return normalized;
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

  if (account.startsWith("qt")) {
    return process.env.DEMO_FRONTDESK_PASSWORD || password;
  }

  return password;
}

export async function login(formData: FormData) {
  const account = String(formData.get("account") ?? "").trim().toLowerCase();
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

  const email = accountEmail(account);
  const passwordToUse = mappedPassword(account, password);

  if (!email.includes("@")) {
    redirect(loginErrorUrl("账号格式不正确", nextPath));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: passwordToUse
  });

  if (error) {
    redirect(loginErrorUrl("账号或密码错误", nextPath));
  }

  redirect(nextPath);
}

export async function logout() {
  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
