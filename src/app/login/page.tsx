import { LogIn } from "lucide-react";
import { login } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_30%_20%,rgba(6,182,212,0.07),transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(59,130,246,0.05),transparent_50%),#060c1a] px-4 py-8 text-slate-100">
      <section className="w-full max-w-[380px] rounded-[18px] border border-white/[0.08] bg-[#0c1525] px-9 py-10 shadow-2xl">
        <div className="flex items-center justify-center gap-3 text-center text-xl font-bold">
          <span className="flex size-10 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">泳</span>
          游泳培训管理系统
        </div>
        <p className="mt-2 text-center text-sm text-slate-400">小型游泳培训机构一站式管理</p>

        <div className="mt-7 grid grid-cols-3 gap-2">
          {[
            ["管理员", "admin"],
            ["教练", "jl001"],
            ["学员", "xy001"]
          ].map(([label, account], index) => (
            <button
              className={`rounded-lg border px-2 py-3 text-sm font-semibold transition ${index === 0 ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" : "border-white/[0.08] text-slate-400 hover:border-cyan-400/40 hover:text-cyan-300"}`}
              form="loginForm"
              key={label}
              name="quickAccount"
              type="submit"
              value={account}
            >
              {label}
            </button>
          ))}
        </div>

        <form action={login} className="mt-6 space-y-4" id="loginForm">
          <input name="next" type="hidden" value={params?.next ?? ""} />
          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            账号
            <input
              className="mt-2 h-11 w-full rounded-md border border-white/[0.08] bg-[#131e33] px-4 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
              defaultValue="admin"
              name="account"
              placeholder="admin / jl001 / xy001"
              type="text"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
            密码
            <input
              className="mt-2 h-11 w-full rounded-md border border-white/[0.08] bg-[#131e33] px-4 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50"
              defaultValue="1324"
              name="password"
              placeholder="请输入密码"
              type="password"
            />
          </label>
          {params?.error ? (
            <p className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300">
              {params.error}
            </p>
          ) : null}
          <button className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-bold text-[#060c1a] transition hover:bg-cyan-300">
            <LogIn size={17} />
            登录
          </button>
        </form>
      </section>
    </main>
  );
}
