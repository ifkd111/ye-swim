import Link from "next/link";
import { CalendarDays, ClipboardCheck, GraduationCap, LayoutDashboard, LogIn, PackageOpen, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui";

const nav = [
  { href: "/dashboard", label: "概览", icon: LayoutDashboard },
  { href: "/members", label: "学员", icon: Users },
  { href: "/products", label: "产品", icon: PackageOpen },
  { href: "/schedule", label: "排课", icon: CalendarDays },
  { href: "/attendance", label: "消课", icon: ClipboardCheck },
  { href: "/coach/today", label: "教练", icon: GraduationCap }
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-ink text-white shadow-soft">泳</span>
          <span className="text-lg font-black">SwimOps</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/dashboard" className="hover:text-ink">
            管理后台
          </Link>
          <Link href="/coach/today" className="hover:text-ink">
            手机出勤
          </Link>
          <Link href="/members" className="hover:text-ink">
            学员数据
          </Link>
        </nav>
        <ButtonLink href="/login" className="h-9" variant="secondary">
          <LogIn size={16} />
          登录
        </ButtonLink>
      </div>
    </header>
  );
}

export function AppShell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200/70 bg-white/90 backdrop-blur lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <span className="flex size-12 items-center justify-center rounded-3xl bg-ink text-lg font-black text-white shadow-soft">
            泳
          </span>
          <div>
            <div className="text-lg font-black text-ink">SwimOps</div>
            <div className="text-xs text-slate-500">培训运营后台</div>
          </div>
        </div>
        <nav className="space-y-2 px-4 py-5">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-extrabold text-slate-600 transition duration-200 hover:-translate-y-0.5 hover:bg-pool-50 hover:text-ink"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/90 backdrop-blur">
          <div className="flex min-h-20 flex-col justify-center gap-1 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black tracking-normal text-ink">{title}</h1>
                <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>
              </div>
              <ButtonLink href="/login" className="hidden h-9 sm:inline-flex" variant="secondary">
                <LogIn size={16} />
                登录
              </ButtonLink>
            </div>
          </div>
          <nav className="soft-scrollbar flex gap-2 overflow-x-auto border-t border-slate-100 px-2 py-2 lg:hidden">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-2xl px-4 text-sm font-extrabold text-slate-600 hover:bg-pool-50"
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
