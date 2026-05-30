import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { clsx } from "clsx";

export function Button({
  className,
  variant = "primary",
  ...props
}: ComponentProps<"button"> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      className={clsx(
        "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-400/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary" && "bg-cyan-400 text-[#060c1a] hover:bg-cyan-300",
        variant === "secondary" && "border border-white/[0.08] bg-[#131e33] text-slate-200 hover:border-cyan-400/30 hover:text-cyan-300",
        variant === "ghost" && "bg-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
        className
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  className,
  variant = "primary",
  ...props
}: ComponentProps<typeof Link> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <Link
      className={clsx(
        "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-400/50 active:scale-[0.98]",
        variant === "primary" && "bg-cyan-400 text-[#060c1a] hover:bg-cyan-300",
        variant === "secondary" && "border border-white/[0.08] bg-[#131e33] text-slate-200 hover:border-cyan-400/30 hover:text-cyan-300",
        variant === "ghost" && "bg-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

export function Panel({
  children,
  className,
  title,
  action
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className={clsx("rounded-lg border border-white/[0.08] bg-[#0c1525]", className)}>
      {(title || action) && (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3">
          {title ? <h2 className="text-sm font-semibold text-slate-100">{title}</h2> : <div />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#0c1525] p-4">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 font-mono text-3xl font-semibold text-cyan-300">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center">
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}
