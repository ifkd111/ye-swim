import Image from "next/image";
import { ArrowRight, CalendarCheck, ClipboardList, ShieldCheck, Smartphone, Users } from "lucide-react";
import { PublicHeader } from "@/components/site-shell";
import { ButtonLink } from "@/components/ui";
import { getSeedData } from "@/lib/mock-data";

const features = [
  { icon: Users, title: "学员档案", text: "姓名、校区、教练、卡项与备注统一整理，查找更快。" },
  { icon: CalendarCheck, title: "排课安排", text: "按日期、时间、校区安排课程，避免临时翻表确认。" },
  { icon: ClipboardList, title: "消课记录", text: "每次出勤都有记录，方便核对课时和回看历史。" },
  { icon: ShieldCheck, title: "分角色使用", text: "管理员、前台、教练看到的功能不同，减少误操作。" }
];

const steps = [
  { title: "先录入学员", text: "在学员页补全姓名、校区、教练和卡项信息。" },
  { title: "再安排课程", text: "到排课页创建今天和本周课程，手机端会同步看到待出勤列表。" },
  { title: "教练手机勾选", text: "上课后直接在教练手机页确认到课，系统会自动写入消课记录。" }
];

export default function HomePage() {
  const seed = getSeedData();

  return (
    <div className="min-h-screen bg-[#f7f7f4] text-ink">
      <PublicHeader />
      <main>
        <section className="relative overflow-hidden border-b border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(209,230,250,0.85),_transparent_38%),linear-gradient(135deg,_#f8fafc_0%,_#eef5fb_45%,_#f7f7f4_100%)]">
          <div className="absolute inset-0">
            <Image
              src="https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=2200&q=80"
              alt="泳池训练场地"
              fill
              priority
              className="object-cover opacity-[0.18] mix-blend-multiply"
            />
          </div>
          <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
            <div className="max-w-2xl self-center">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-pool-700">SwimOps</p>
              <h1 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em] text-ink sm:text-5xl lg:text-6xl">
                让排课、出勤、消课都在一个清楚的后台里完成。
              </h1>
              <p className="mt-5 max-w-xl text-lg font-semibold leading-8 text-slate-700">
                适合游泳培训机构日常使用。前台安排课程，教练手机确认出勤，管理员随时查看学员和消课情况。
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/login" className="h-11">
                  进入工作台
                  <ArrowRight size={18} />
                </ButtonLink>
                <ButtonLink href="/coach/today" className="h-11" variant="secondary">
                  <Smartphone size={18} />
                  打开教练手机页
                </ButtonLink>
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ["当前学员", seed.stats.members],
                  ["课程安排", seed.stats.schedules],
                  ["消课记录", seed.stats.attendanceLogs]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-line backdrop-blur">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
                    <div className="mt-2 text-3xl font-black text-ink">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="self-center rounded-[2rem] border border-white/80 bg-white/88 p-4 shadow-soft backdrop-blur">
              <div className="rounded-[1.6rem] bg-ink p-5 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-pool-100">今天先做什么</div>
                    <div className="mt-1 text-3xl font-black">三步走</div>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-black">手机也能操作</div>
                </div>
                <div className="mt-5 grid gap-3">
                  {steps.map((step, index) => (
                    <div key={step.title} className="rounded-3xl border border-white/10 bg-white/10 p-4">
                      <div className="text-xs font-black uppercase tracking-[0.16em] text-pool-100">Step {index + 1}</div>
                      <div className="mt-1 text-lg font-black">{step.title}</div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-pool-50">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-[#fcfbf7] p-5">
                <div className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">适用场景</div>
                <div className="mt-3 grid gap-3">
                  {["前台快速查看今天课程", "教练上完课手机点一下就完成出勤", "管理员回看学员剩余课时和历史记录"].map((item) => (
                    <div key={item} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-line">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-pool-700">怎么使用</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-ink">第一次用，按这个顺序最省心。</h2>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-[1.75rem] border border-slate-200 bg-[#f8fafc] p-6 shadow-line">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-pool-100 text-lg font-black text-pool-700">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 text-xl font-black text-ink">{step.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[#f8fafc] py-14">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-line transition duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <Icon className="text-pool-600" size={24} />
                  <h3 className="mt-4 text-lg font-black text-ink">{feature.title}</h3>
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
