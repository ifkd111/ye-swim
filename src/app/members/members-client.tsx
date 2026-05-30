"use client";

import { Plus, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { createMemberAction, deleteMemberAction, updateMemberAction } from "@/app/members/actions";
import { MembersTable } from "@/components/data-table";
import { Field, inputClass, Modal, textareaClass } from "@/components/modal";
import { AppShell } from "@/components/site-shell";
import { Button, Panel } from "@/components/ui";
import { useRecords, storageKeys } from "@/hooks/use-local-records";
import { calculateMemberStatus, makeLocalId } from "@/lib/forms";
import { canManageMembers } from "@/lib/permissions";
import type { DataMode } from "@/lib/data-source";
import type { Member, ProductType, UserRole } from "@/lib/types";

const productOptions: Array<{ label: string; value: ProductType }> = [
  { label: "次卡", value: "class_pack" },
  { label: "月卡", value: "monthly" },
  { label: "集训", value: "camp" },
  { label: "VIP", value: "vip" }
];

export function MembersClient({
  initialMembers,
  dataMode,
  viewerRole,
  viewerName
}: {
  initialMembers: Member[];
  dataMode: DataMode;
  viewerRole: UserRole | null;
  viewerName: string | null;
}) {
  const { records: members, setRecords: setMembers, reset } = useRecords(storageKeys.members, initialMembers, dataMode === "demo");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"全部" | Member["status"]>("全部");
  const [open, setOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();
  const allowWrite = canManageMembers(viewerRole, dataMode);
  const nextNo = useMemo(() => Math.max(0, ...members.map((member) => member.memberNo)) + 1, [members]);

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return members.filter((member) => {
      const text = [member.chineseName, member.englishName, member.campus, member.coach, member.phone, member.wechat]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (!normalized || text.includes(normalized)) && (status === "全部" || member.status === status);
    });
  }, [members, query, status]);

  function buildMemberFromForm(form: FormData, existing?: Member): Member | null {
    const name = String(form.get("name") ?? "").trim();
    if (!name) return null;

    const productType = String(form.get("productType") ?? "class_pack") as ProductType;
    const totalLessons = Number(form.get("totalLessons") || 20);
    const usedLessons = Number(form.get("usedLessons") || 0);
    const remainingLessons = productType === "class_pack" ? totalLessons - usedLessons : totalLessons;
    return {
      id: existing?.id ?? makeLocalId("member"),
      memberNo: existing?.memberNo ?? nextNo,
      chineseName: name,
      englishName: String(form.get("englishName") ?? "").trim() || null,
      gender: String(form.get("gender") ?? "").trim() || null,
      phone: String(form.get("phone") ?? "").trim() || null,
      wechat: String(form.get("wechat") ?? "").trim() || null,
      campus: String(form.get("campus") ?? "").trim() || null,
      coach: String(form.get("coach") ?? "").trim() || "未分配",
      productId: `local-${productType}`,
      productName: productOptions.find((item) => item.value === productType)?.label ?? "次卡",
      productType,
      totalLessons,
      usedLessons,
      remainingLessons,
      cardStartDate: String(form.get("cardStartDate") ?? "") || null,
      cardExpireDate: String(form.get("cardExpireDate") ?? "") || null,
      campStartDate: null,
      campEndDate: null,
      status: calculateMemberStatus(productType, totalLessons, usedLessons),
      notes: String(form.get("notes") ?? "").trim() || null
    };
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (isPending || !allowWrite) return;
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const member = buildMemberFromForm(form, editingMember ?? undefined);
    if (!member) return;

    if (dataMode === "supabase") {
      startTransition(async () => {
        const result = editingMember
          ? await updateMemberAction(editingMember.id, form)
          : await createMemberAction(form);
        setToast(result.message);
        if (result.ok) {
          setOpen(false);
          setEditingMember(null);
          window.location.reload();
        }
      });
      return;
    }

    setMembers((current) =>
      editingMember ? current.map((item) => (item.id === editingMember.id ? member : item)) : [member, ...current]
    );
    setOpen(false);
    setEditingMember(null);
    event.currentTarget.reset();
  }

  function editMember(member: Member) {
    if (!allowWrite || isPending) return;
    setEditingMember(member);
    setOpen(true);
  }

  function deleteMember(member: Member) {
    if (!allowWrite || isPending) return;
    const confirmed = window.confirm(`确认删除学员「${member.chineseName}」？相关排课和日志也会受到影响。`);
    if (!confirmed) return;

    if (dataMode === "supabase") {
      startTransition(async () => {
        const result = await deleteMemberAction(member.id);
        setToast(result.message);
        if (result.ok) window.location.reload();
      });
      return;
    }

    setMembers((current) => current.filter((item) => item.id !== member.id));
  }

  function openCreate() {
    if (!allowWrite || isPending) return;
    setEditingMember(null);
    setOpen(true);
  }

  return (
    <AppShell
      title="学员管理"
      subtitle={dataMode === "supabase" ? "已连接 Supabase：新增、编辑、删除会写入数据库。" : "演示模式：新增、编辑、删除保存在浏览器本地。"}
      viewerName={viewerName}
      viewerRole={viewerRole}
    >
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-13 w-full rounded-3xl border border-slate-200 bg-white py-4 pl-11 pr-4 text-sm font-bold text-ink shadow-line outline-none transition focus:border-pool-500 focus:ring-4 focus:ring-pool-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索姓名、校区、教练、手机号"
            value={query}
          />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          {(["全部", "正常", "即将用完", "已完成", "欠课"] as const).map((item) => (
            <button
              className={`h-13 shrink-0 rounded-3xl border px-4 text-sm font-extrabold transition ${
                status === item
                  ? "border-ink bg-ink text-white shadow-soft"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-pool-50"
              }`}
              key={item}
              onClick={() => setStatus(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {allowWrite ? (
            <Button className="h-13 flex-1 lg:flex-none" disabled={isPending} onClick={openCreate}>
              <Plus size={18} />
              添加学员
            </Button>
          ) : null}
          <Button className="h-13 px-3" disabled={dataMode === "supabase"} onClick={reset} title="重置演示数据" type="button" variant="secondary">
            <RotateCcw size={18} />
          </Button>
        </div>
      </div>
      {toast ? <div className="mb-4 rounded-3xl border border-pool-100 bg-pool-50 px-4 py-3 text-sm font-bold text-pool-700">{toast}</div> : null}

      <Panel
        action={
          <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
            <SlidersHorizontal size={16} />
            {filteredMembers.length} / {members.length}
          </span>
        }
        title="全部学员"
      >
        <MembersTable
          actionsDisabled={isPending}
          members={filteredMembers}
          onDelete={allowWrite ? deleteMember : undefined}
          onEdit={allowWrite ? editMember : undefined}
        />
      </Panel>

      <Modal
        onClose={() => {
          setOpen(false);
          setEditingMember(null);
        }}
        open={open}
        title={editingMember ? "编辑学员" : "添加学员"}
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Field label="中文名">
            <input className={inputClass} defaultValue={editingMember?.chineseName ?? ""} name="name" placeholder="例如：王一诺" required />
          </Field>
          <Field label="英文名">
            <input className={inputClass} defaultValue={editingMember?.englishName ?? ""} name="englishName" placeholder="可选" />
          </Field>
          <Field label="性别">
            <select className={inputClass} defaultValue={editingMember?.gender ?? ""} name="gender">
              <option value="">未填</option>
              <option value="女">女</option>
              <option value="男">男</option>
            </select>
          </Field>
          <Field label="校区">
            <input className={inputClass} defaultValue={editingMember?.campus ?? ""} name="campus" placeholder="古北 / 国际 / 绿洲" />
          </Field>
          <Field label="手机号">
            <input className={inputClass} defaultValue={editingMember?.phone ?? ""} inputMode="tel" name="phone" placeholder="家长手机号" />
          </Field>
          <Field label="微信">
            <input className={inputClass} defaultValue={editingMember?.wechat ?? ""} name="wechat" placeholder="微信号或备注" />
          </Field>
          <Field label="教练">
            <input className={inputClass} defaultValue={editingMember?.coach ?? ""} name="coach" placeholder="例如：古北教练" />
          </Field>
          <Field label="会员类型">
            <select className={inputClass} defaultValue={editingMember?.productType ?? "class_pack"} name="productType">
              {productOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="总课时">
            <input className={inputClass} defaultValue={editingMember?.totalLessons ?? 20} inputMode="numeric" min={0} name="totalLessons" type="number" />
          </Field>
          <Field label="已消课">
            <input className={inputClass} defaultValue={editingMember?.usedLessons ?? 0} disabled={dataMode === "supabase"} inputMode="numeric" min={0} name="usedLessons" type="number" />
          </Field>
          <Field label="开卡日期">
            <input className={inputClass} defaultValue={editingMember?.cardStartDate ?? ""} name="cardStartDate" type="date" />
          </Field>
          <Field label="到期日期">
            <input className={inputClass} defaultValue={editingMember?.cardExpireDate ?? ""} name="cardExpireDate" type="date" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="备注">
              <textarea className={textareaClass} defaultValue={editingMember?.notes ?? ""} name="notes" placeholder="身体情况、家长偏好、缴费备注等" />
            </Field>
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button onClick={() => setOpen(false)} type="button" variant="secondary">
              取消
            </Button>
            <Button disabled={isPending} type="submit">{isPending ? "保存中..." : "保存学员"}</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
