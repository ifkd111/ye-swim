"use client";

import { X } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui";

export function Modal({
  open,
  title,
  children,
  onClose,
  className
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-3 backdrop-blur-sm sm:items-center">
      <div
        className={clsx(
          "max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/70 bg-white shadow-soft",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-ink">{title}</h2>
          <Button aria-label="关闭" className="size-10 rounded-2xl px-0" onClick={onClose} type="button" variant="ghost">
            <X size={18} />
          </Button>
        </div>
        <div className="soft-scrollbar max-h-[calc(92vh-72px)] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm font-extrabold text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p> : null}
    </label>
  );
}

export const inputClass =
  "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-ink outline-none transition focus:border-pool-500 focus:ring-4 focus:ring-pool-100";

export const textareaClass =
  "min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-ink outline-none transition focus:border-pool-500 focus:ring-4 focus:ring-pool-100";
