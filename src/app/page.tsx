import Image from "next/image";
import { ArrowRight, CalendarCheck, ClipboardList, ShieldCheck, Smartphone, Users } from "lucide-react";
import { PublicHeader } from "@/components/site-shell";
import { ButtonLink } from "@/components/ui";
import { getSeedData } from "@/lib/mock-data";

const features = [
  { icon: Users, title: "学员档案", text: "会员类型、到期日、剩余课时和备注统一管理。" },
  { icon: CalendarCheck, title: "排课出勤", text: "按校区、时间、教练组织课程，手机端可勾选。" },
  { icon: ClipboardList, title: "消课日志", text: "所有扣课都有日志，支持负课时和追溯。" },
  { icon: ShieldCheck, title: "角色权限", text: "管理员、前台、教练分工清楚，减少误操作。" }
];

export default function HomePage() {
  const seed = getSeedData();

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden bg-pool-50">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=2200&q=80"
              alt="游泳训练泳池"
              fill
              priority
              className="object-cover opacity-30"
            />
          </div>
          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl content-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-pool-700">SwimOps v1</p>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-normal text-ink sm:text-5xl lg:text-6xl">
                游泳培训管理系统
              </h1>
              <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-slate-700">
                用一个后台管理学员、排课、出勤、消课和续费提醒。第一版已接入你的 Excel 样例数据，适合小型游泳培训机构从真实业务表迁移。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/dashboard" className="h-11">
                  打开后台
                  <ArrowRight size={18} />
                </ButtonLink>
                <ButtonLink href="/coach/today" className="h-11" variant="secondary">
                  <Smartphone size={18} />
                  手机出勤页
                </ButtonLink>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-soft backdrop-blur">
              <div className="rounded-[1.5rem] bg-ink p-4 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-pool-100">今日课程</div>
                    <div className="mt-1 text-3xl font-black">18</div>
                  </div>
                  <div className="rounded-2xl bg-white/12 px-3 py-2 text-sm font-black">手机出勤</div>
                </div>
                <div className="mt-5 grid gap-2">
                  {["16:30 · 古北 · 藤原瑛太", "17:30 · 国际 · 陈悦铭", "19:00 · 绿洲 · 白卓可"].map((item) => (
                    <div className="rounded-2xl bg-white/10 px-3 py-3 text-sm font-bold" key={item}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  ["学员", seed.stats.members],
                  ["排课", seed.stats.schedules],
                  ["日志", seed.stats.attendanceLogs]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl bg-pool-50 p-4 text-center">
                    <div className="text-xs font-black text-slate-500">{label}</div>
                    <div className="mt-1 text-2xl font-black text-ink">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white py-12">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="rounded-3xl border border-slate-200 p-5 shadow-line transition hover:-translate-y-0.5 hover:shadow-soft">
                  <Icon className="text-pool-600" size={24} />
                  <h2 className="mt-4 text-base font-black text-ink">{feature.title}</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{feature.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
