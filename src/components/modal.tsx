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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center">
      <div
        className={clsx(
          "max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg border border-white/[0.08] bg-[#0c1525] shadow-2xl",
          className
        )}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          <Button aria-label="关闭" className="size-9 rounded-md px-0" onClick={onClose} type="button" variant="ghost">
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
    <label className="block text-sm font-semibold text-slate-400">
      {label}
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1 text-xs font-medium text-slate-600">{hint}</p> : null}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-md border border-white/[0.08] bg-[#131e33] px-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50";

export const textareaClass =
  "min-h-24 w-full rounded-md border border-white/[0.08] bg-[#131e33] px-3 py-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/50";
