import { LogIn } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { login } from "./actions";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen bg-[linear-gradient(135deg,_#f7f7f4_0%,_#eef5fb_52%,_#f8fafc_100%)] px-4 py-8 lg:grid-cols-[1fr_520px] lg:p-0">
      <section className="hidden bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.16),_transparent_34%),linear-gradient(180deg,_#172347_0%,_#111a34_100%)] px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-11 items-center justify-center rounded-3xl bg-white text-pool-700">泳</span>
          SwimOps
        </div>
        <div>
          <h1 className="max-w-xl text-5xl font-black leading-tight tracking-[-0.04em]">开始今天的课程安排和出勤记录。</h1>
          <p className="mt-5 max-w-lg text-base font-semibold leading-7 text-pool-50">
            前台可以安排课程，教练可以确认出勤，管理员可以查看整体情况。登录后会自动进入对应的工作页面。
          </p>
        </div>
        <div className="grid max-w-xl gap-3 text-sm font-semibold text-pool-100">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">管理员：查看全部并管理账号</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">前台：录入学员、安排课程、查看记录</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">教练：手机确认上课出勤</div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center lg:px-12">
        <div className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-soft backdrop-blur">
          <div className="flex size-14 items-center justify-center rounded-3xl bg-pool-50 text-pool-700">
            <LogIn size={22} />
          </div>
          <h2 className="mt-5 text-3xl font-black text-ink">员工登录</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            输入你的登录账号和密码即可进入工作台。
          </p>
          <form action={login} className="mt-6 space-y-3">
            <input name="next" type="hidden" value={params?.next ?? ""} />
            <label className="block text-sm font-medium text-slate-700">
              账号
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-[#f7faff] px-4 font-bold outline-none transition focus:border-pool-500 focus:ring-4 focus:ring-pool-100"
                name="account"
                placeholder="请输入登录账号"
                type="text"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              密码
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-[#f7faff] px-4 font-bold outline-none transition focus:border-pool-500 focus:ring-4 focus:ring-pool-100"
                name="password"
                placeholder="请输入密码"
                type="password"
              />
            </label>
            {params?.error ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {params.error}
              </p>
            ) : null}
            <button className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-pool-700 focus:outline-none focus:ring-2 focus:ring-pool-500 focus:ring-offset-2 active:scale-[0.98]">
              登录
            </button>
          </form>
          <div className="mt-3 flex flex-col gap-3">
            <ButtonLink href="/coach/today" className="h-11" variant="secondary">
              打开教练手机页
            </ButtonLink>
          </div>
        </div>
      </section>
    </main>
  );
}
