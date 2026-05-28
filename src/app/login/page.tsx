import { LogIn } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { login } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen bg-slate-50 px-4 py-8 lg:grid-cols-[1fr_520px] lg:p-0">
      <section className="hidden bg-ink px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-11 items-center justify-center rounded-3xl bg-white text-pool-700">泳</span>
          SwimOps
        </div>
        <div>
          <h1 className="max-w-xl text-5xl font-black leading-tight tracking-normal">把出勤和消课从 Excel 迁到一个清楚的后台。</h1>
          <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-pool-50">
            Supabase Auth 接入后，这里会使用真实账号登录；当前第一版保留演示入口，方便先验收页面和流程。
          </p>
        </div>
        <p className="text-sm text-pool-100">管理员 / 前台 / 教练角色权限已在 schema 中预留。</p>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center lg:px-12">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-pool-50 text-pool-700">
            <LogIn size={22} />
          </div>
          <h2 className="mt-5 text-3xl font-black text-ink">员工登录</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            演示账号为 admin，密码为 1324。填入 Supabase 环境变量后，也可接入真实员工账号。
          </p>
          <form action={login} className="mt-6 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              用户名
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none transition focus:border-pool-500 focus:ring-4 focus:ring-pool-100"
                name="account"
                placeholder="admin"
                type="text"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              密码
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 font-bold outline-none transition focus:border-pool-500 focus:ring-4 focus:ring-pool-100"
                name="password"
                placeholder="••••••••"
                type="password"
              />
            </label>
            {params?.error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {params.error}
              </p>
            ) : null}
            <button className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-pool-700 focus:outline-none focus:ring-2 focus:ring-pool-500 focus:ring-offset-2 active:scale-[0.98]">
              登录
            </button>
          </form>
          <div className="mt-3 flex flex-col gap-3">
            <ButtonLink href="/coach/today" className="h-11" variant="secondary">
              进入教练手机页
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
