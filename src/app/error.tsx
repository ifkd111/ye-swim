"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error?.message || "页面加载失败";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060c1a] px-4 py-8 text-slate-100">
      <section className="w-full max-w-[560px] rounded-lg border border-red-400/25 bg-[#0c1525] p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
            <AlertTriangle size={22} />
          </span>
          <div>
            <h1 className="text-lg font-bold text-white">页面加载失败</h1>
            <p className="mt-1 text-xs font-semibold text-slate-500">ye-swim v{APP_VERSION}</p>
          </div>
        </div>

        <p className="mt-4 rounded-md border border-white/[0.08] bg-[#131e33] p-3 text-sm leading-6 text-slate-300">
          {message.includes("permission denied")
            ? "数据库权限还没有同步到当前版本。请先执行数据库迁移，或者在 GitHub Actions 里配置 SUPABASE_DB_URL 后重新部署。"
            : message}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-cyan-400 px-4 text-sm font-bold text-[#060c1a]"
            onClick={reset}
            type="button"
          >
            <RefreshCcw size={16} />
            重试
          </button>
          <Link className="inline-flex h-10 items-center rounded-md border border-white/[0.08] px-4 text-sm font-bold text-slate-200" href="/login">
            回到登录
          </Link>
        </div>
      </section>
    </main>
  );
}
