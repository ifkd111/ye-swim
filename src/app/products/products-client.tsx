"use client";

import { Pencil, Plus } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import { createProductAction, updateProductAction } from "@/app/products/actions";
import { Field, inputClass, Modal, textareaClass } from "@/components/modal";
import { AppShell } from "@/components/site-shell";
import { Badge, Button, Panel } from "@/components/ui";
import { getProductTypeLabel } from "@/lib/status";
import type { CourseProduct, ProductType, UserRole } from "@/lib/types";

const productTypes: Array<{ value: ProductType; label: string }> = [
  { value: "class_pack", label: "次卡" },
  { value: "monthly", label: "月卡" },
  { value: "camp", label: "集训" },
  { value: "vip", label: "VIP" }
];

export function ProductsClient({
  products,
  mode,
  viewerName,
  viewerRole
}: {
  products: CourseProduct[];
  mode: string;
  viewerName: string | null;
  viewerRole: UserRole | null;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CourseProduct | null>(null);
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();
  const canEdit = viewerRole === "admin" || viewerRole === "frontdesk" || mode === "demo";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = editing ? await updateProductAction(editing.id, form) : await createProductAction(form);
      setToast(result.message);
      if (result.ok) {
        setOpen(false);
        setEditing(null);
        window.location.reload();
      }
    });
  }

  return (
    <AppShell
      title="课程产品"
      subtitle={mode === "supabase" ? "产品用于学员申请和管理员审核。" : "次卡扣课，月卡/集训/VIP 不扣课。"}
      viewerName={viewerName}
      viewerRole={viewerRole}
    >
      {canEdit ? (
        <div className="mb-5 flex justify-end">
          <Button className="h-13" disabled={isPending} onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus size={18} />
            新增产品
          </Button>
        </div>
      ) : null}

      {toast ? <div className="mb-4 rounded-3xl border border-pool-100 bg-pool-50 px-4 py-3 text-sm font-bold text-pool-700">{toast}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <Panel key={product.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">{product.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{product.notes}</p>
              </div>
              <Badge className="border-pool-100 bg-pool-50 text-pool-700">{getProductTypeLabel(product.type)}</Badge>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-slate-500">总课时</div>
                <div className="mt-1 text-xl font-semibold text-ink">{product.totalLessons}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-slate-500">有效天数</div>
                <div className="mt-1 text-xl font-semibold text-ink">{product.validDays ?? "长期"}</div>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-slate-500">价格</div>
                <div className="mt-1 text-xl font-semibold text-ink">¥{product.price}</div>
              </div>
            </div>
            {canEdit ? (
              <Button className="mt-5 h-10 rounded-xl" disabled={isPending} onClick={() => { setEditing(product); setOpen(true); }} type="button" variant="secondary">
                <Pencil size={16} />
                编辑
              </Button>
            ) : null}
          </Panel>
        ))}
      </div>

      <Modal onClose={() => { setOpen(false); setEditing(null); }} open={open} title={editing ? "编辑产品" : "新增产品"}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Field label="产品名称">
            <input className={inputClass} defaultValue={editing?.name ?? ""} name="name" required />
          </Field>
          <Field label="类型">
            <select className={inputClass} defaultValue={editing?.type ?? "class_pack"} name="type">
              {productTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="总课时">
            <input className={inputClass} defaultValue={editing?.totalLessons ?? 20} min={0} name="totalLessons" type="number" />
          </Field>
          <Field label="有效天数">
            <input className={inputClass} defaultValue={editing?.validDays ?? ""} min={0} name="validDays" type="number" />
          </Field>
          <Field label="价格">
            <input className={inputClass} defaultValue={editing?.price ?? 0} min={0} name="price" type="number" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="备注">
              <textarea className={textareaClass} defaultValue={editing?.notes ?? ""} name="notes" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="secondary">取消</Button>
            <Button disabled={isPending} type="submit">{isPending ? "保存中..." : "保存"}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
