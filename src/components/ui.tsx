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
        "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold transition duration-200 focus:outline-none focus:ring-2 focus:ring-pool-500 focus:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55",
        variant === "primary" && "bg-ink text-white shadow-soft hover:-translate-y-0.5 hover:bg-pool-700",
        variant === "secondary" && "border border-slate-200 bg-white text-ink shadow-line hover:-translate-y-0.5 hover:border-pool-200 hover:bg-pool-50",
        variant === "ghost" && "bg-transparent text-slate-700 hover:bg-slate-100",
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
        "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 text-sm font-extrabold transition duration-200 focus:outline-none focus:ring-2 focus:ring-pool-500 focus:ring-offset-2 active:scale-[0.98]",
        variant === "primary" && "bg-ink text-white shadow-soft hover:-translate-y-0.5 hover:bg-pool-700",
        variant === "secondary" && "border border-slate-200 bg-white text-ink shadow-line hover:-translate-y-0.5 hover:border-pool-200 hover:bg-pool-50",
        variant === "ghost" && "bg-transparent text-slate-700 hover:bg-slate-100",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full border px-3 py-1 text-xs font-extrabold", className)}>
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
    <section className={clsx("rounded-3xl border border-slate-200/80 bg-white shadow-line", className)}>
      {(title || action) && (
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          {title ? <h2 className="text-base font-extrabold text-ink">{title}</h2> : <div />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-line transition duration-200 hover:-translate-y-0.5 hover:shadow-soft">
      <div className="text-sm font-bold text-slate-500">{label}</div>
      <div className="mt-2 text-4xl font-black text-ink">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{detail}</div>
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center px-6 py-8 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  );
}
