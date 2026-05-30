import Link from "next/link";
import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  PackageOpen,
  ShieldPlus,
  UserCheck,
  Users
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { ButtonLink } from "@/components/ui";
import { canManageStaff, getRoleLabel } from "@/lib/permissions";
import { APP_VERSION } from "@/lib/version";
import type { UserRole } from "@/lib/types";

const nav = [
  { href: "/dashboard", label: "概览", icon: LayoutDashboard },
  { href: "/members", label: "学员", icon: Users },
  { href: "/products", label: "产品", icon: PackageOpen },
  { href: "/availability", label: "空余时间", icon: CalendarClock },
  { href: "/booking-requests", label: "预约审批", icon: CalendarCheck2 },
  { href: "/course-applications", label: "课程申请", icon: UserCheck },
  { href: "/imports", label: "导入", icon: FileSpreadsheet },
  { href: "/schedule", label: "排课", icon: CalendarDays },
  { href: "/attendance", label: "消课", icon: ClipboardCheck },
  { href: "/coach/today", label: "教练", icon: GraduationCap },
  { href: "/student", label: "学员端", icon: UserCheck },
  { href: "/staff", label: "账号", icon: ShieldPlus }
];

function navForRole(role: UserRole | null) {
  if (role === "coach") {
    return nav.filter((item) => ["/coach/today", "/availability", "/schedule", "/members"].includes(item.href));
  }

  if (role === "student") {
    return nav.filter((item) => ["/student", "/products"].includes(item.href));
  }

  return nav.filter((item) => {
    if (item.href === "/student") return false;
    if (item.href === "/staff") return canManageStaff(role);
    if (item.href === "/imports") return canManageStaff(role);
    return true;
  });
}

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

export function AppShell({
  children,
  title,
  subtitle,
  viewerName,
  viewerRole
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  viewerName?: string | null;
  viewerRole?: UserRole | null;
}) {
  const visibleNav = navForRole(viewerRole ?? null);
  const initials = (viewerName || getRoleLabel(viewerRole ?? null) || "游").slice(0, 1);

  return (
    <div className="min-h-screen bg-[#060c1a] text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[230px] border-r border-white/[0.08] bg-[#0c1525] lg:flex lg:flex-col">
        <div className="flex h-[58px] items-center gap-3 border-b border-white/[0.08] px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-cyan-400/10 text-lg font-black text-cyan-300">泳</span>
          <div>
            <div className="text-sm font-black text-white">游泳培训</div>
            <div className="text-[11px] text-slate-500">V3 运营后台 · v{APP_VERSION}</div>
          </div>
        </div>
        <nav className="soft-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-3">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
              >
                <Icon className="text-cyan-300/80" size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1a2842] text-xs font-black text-cyan-300">{initials}</span>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-slate-200">{viewerName || getRoleLabel(viewerRole ?? null)}</div>
              <div className="text-[11px] text-slate-500">{getRoleLabel(viewerRole ?? null)}</div>
            </div>
          </div>
          <LogoutButton className="h-8 rounded-md border-white/[0.08] bg-transparent px-2 text-xs text-slate-400 hover:bg-red-500/10 hover:text-red-300" />
        </div>
      </aside>

      <div className="lg:pl-[230px]">
        <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#0c1525]">
          <div className="flex min-h-[58px] flex-col justify-center gap-1 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-base font-bold tracking-normal text-white">{title}</h1>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>
                {viewerRole ? (
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300 lg:hidden">
                    {getRoleLabel(viewerRole)}
                    {viewerName ? ` · ${viewerName}` : ""}
                  </p>
                ) : null}
              </div>
              <LogoutButton className="h-8 rounded-md bg-cyan-400 px-3 text-xs font-black text-[#060c1a] lg:hidden" />
            </div>
          </div>
          <nav className="soft-scrollbar flex gap-2 overflow-x-auto border-t border-white/[0.08] px-2 py-2 lg:hidden">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-bold text-slate-400 hover:bg-white/[0.04] hover:text-white"
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="px-4 py-5 sm:px-6">{children}</main>
        <footer className="px-4 pb-5 text-[11px] font-semibold text-slate-600 sm:px-6">
          ye-swim v{APP_VERSION}
        </footer>
      </div>
    </div>
  );
}
