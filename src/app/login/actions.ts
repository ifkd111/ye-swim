"use server";

import { redirect } from "next/navigation";
import { demoAdminEmail } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const account = String(formData.get("account") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const hasSupabaseConfig =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseConfig) {
    if (account === "admin" && password === "1324") {
      redirect("/dashboard");
    }

    redirect(`/login?error=${encodeURIComponent("用户名或密码错误")}`);
  }

  const email = account === "admin" ? demoAdminEmail : account;

  if (!email.includes("@")) {
    redirect(`/login?error=${encodeURIComponent("Supabase 登录需要邮箱地址")}`);
  }

  {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/dashboard");
  }
}

export async function logout() {
  const hasSupabaseConfig =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (hasSupabaseConfig) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
