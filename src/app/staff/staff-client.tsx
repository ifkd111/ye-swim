"use client";

import { Pencil, Plus, Search, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  createStaffAccountAction,
  deleteStaffAccountAction,
  updateStaffAccountAction
} from "@/app/staff/actions";
import { compareValues, SortButton, type SortDir } from "@/components/data-table";
import { Field, inputClass, Modal } from "@/components/modal";
import { AppShell } from "@/components/site-shell";
import { Badge, Button, EmptyState, Panel } from "@/components/ui";
import type { StaffAccount } from "@/lib/supabase/staff-admin";
import type { Member, UserRole } from "@/lib/types";

const roleOptions: Array<{ label: string; value: UserRole }> = [
  { label: "管理员", value: "admin" },
  { label: "教练", value: "coach" },
  { label: "学员", value: "student" }
];

function roleLabel(role: UserRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

function roleTone(role: UserRole) {
  if (role === "admin") return "border-red-200 bg-red-50 text-red-700";
  if (role === "frontdesk") return "border-blue-200 bg-blue-50 text-blue-700";
  if (role === "coach") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-pool-100 bg-pool-50 text-pool-700";
}

function formatDate(value: string | null) {
  if (!value) return "未登录";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function displayAccount(account: StaffAccount) {
  return account.email.replace(/@swimops\.local$/i, "");
}

function buildLocalAccount(form: FormData, existing?: StaffAccount | null): StaffAccount | null {
  const account = String(form.get("account") ?? "").trim().toLowerCase();
  const fullName = String(form.get("fullName") ?? "").trim();
  const role = String(form.get("role") ?? "").trim() as UserRole;

  if (!account || !fullName || !role) return null;

  return {
    id: existing?.id ?? `local-${Date.now()}`,
    email: account === "admin" ? "admin@swimops.local" : `${account}@swimops.local`,
    fullName,
    role,
    account,
    campus: String(form.get("campus") ?? "").trim() || null,
    coachName: role === "coach" ? String(form.get("coachName") ?? "").trim() || null : null,
    remarkName: String(form.get("remarkName") ?? "").trim() || null,
    memberId: role === "student" ? String(form.get("memberId") ?? "").trim() || null : null,
    memberName: null,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    lastSignInAt: existing?.lastSignInAt ?? null,
    isCurrentUser: existing?.isCurrentUser ?? false
  };
}

export function StaffClient({
  initialAccounts,
  hasAdminRuntime,
  members,
  viewerName = null,
  viewerRole = "admin"
}: {
  initialAccounts: StaffAccount[];
  hasAdminRuntime: boolean;
  members: Member[];
  viewerName?: string | null;
  viewerRole?: UserRole | null;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<StaffAccount | null>(null);
  const [toast, setToast] = useState("");
  const [sortKey, setSortKey] = useState<"user" | "account" | "role" | "campus" | "remark" | "lastSignIn">("user");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [isPending, startTransition] = useTransition();

  const filteredAccounts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const scoped = accounts.filter((account) => {
      const shortAccount = displayAccount(account);
      const text = [account.fullName, shortAccount, account.role, account.campus, account.coachName, account.remarkName, account.memberName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return !normalized || text.includes(normalized);
    });
    const pick = {
      user: (account: StaffAccount) => account.fullName,
      account: (account: StaffAccount) => displayAccount(account),
      role: (account: StaffAccount) => roleLabel(account.role),
      campus: (account: StaffAccount) => account.campus ?? "",
      remark: (account: StaffAccount) => account.remarkName ?? "",
      lastSignIn: (account: StaffAccount) => account.lastSignInAt ?? ""
    };
    return [...scoped].sort((a, b) => compareValues(pick[sortKey](a), pick[sortKey](b), sortDir));
  }, [accounts, query, sortDir, sortKey]);

  function sortBy(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function closeModal() {
    if (isPending) return;
    setOpen(false);
    setEditingAccount(null);
  }

  function openCreate() {
    if (!hasAdminRuntime || isPending) return;
    setEditingAccount(null);
    setOpen(true);
  }

  function openEdit(account: StaffAccount) {
    if (!hasAdminRuntime || isPending) return;
    setEditingAccount(account);
    setOpen(true);
  }

  function removeAccount(account: StaffAccount) {
    if (!hasAdminRuntime || isPending) return;
    const confirmed = window.confirm(`确认删除账号「${displayAccount(account)}」吗？此操作会删除其登录身份。`);
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteStaffAccountAction(account.id);
      setToast(result.message);
      if (result.ok) {
        setAccounts((current) => current.filter((item) => item.id !== account.id));
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (isPending || !hasAdminRuntime) return;
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const optimisticAccount = buildLocalAccount(form, editingAccount);

    startTransition(async () => {
      const result = editingAccount
        ? await updateStaffAccountAction(editingAccount.id, form)
        : await createStaffAccountAction(form);
      setToast(result.message);
      if (!result.ok) return;

      if (optimisticAccount) {
        setAccounts((current) => {
          if (editingAccount) {
            return current.map((item) => (item.id === editingAccount.id ? { ...item, ...optimisticAccount } : item));
          }
          return [optimisticAccount, ...current];
        });
      }

      closeModal();
    });
  }

  return (
      <AppShell
      title="账号管理"
      subtitle={
        hasAdminRuntime
          ? "管理员可创建老板、教练和学员账号。学员账号需绑定学员档案。"
          : "当前环境缺少服务端管理密钥，只能查看说明，无法直接在网页里创建账号。"
      }
      viewerName={viewerName}
      viewerRole={viewerRole}
    >
      {!hasAdminRuntime ? (
        <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
          需要在服务端环境配置 `SUPABASE_SERVICE_ROLE_KEY` 才能在网页里管理账号。
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-13 w-full rounded-3xl border border-slate-200 bg-white py-4 pl-11 pr-4 text-sm font-bold text-ink shadow-line outline-none transition focus:border-pool-500 focus:ring-4 focus:ring-pool-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索姓名、账号、角色、校区、教练名、学员"
            value={query}
          />
        </label>
        <Button className="h-13" disabled={!hasAdminRuntime || isPending} onClick={openCreate}>
          <Plus size={18} />
          添加账号
        </Button>
      </div>

      {toast ? <div className="mb-4 rounded-3xl border border-pool-100 bg-pool-50 px-4 py-3 text-sm font-bold text-pool-700">{toast}</div> : null}

      <Panel
        action={<span className="text-sm font-bold text-slate-500">{filteredAccounts.length} 个账号</span>}
        title="账号列表"
      >
        {filteredAccounts.length ? (
          <div className="soft-scrollbar overflow-x-auto">
            <table className="min-w-[1120px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3"><SortButton active={sortKey === "user"} dir={sortDir} label="用户" onClick={() => sortBy("user")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "account"} dir={sortDir} label="登录账号" onClick={() => sortBy("account")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "role"} dir={sortDir} label="角色" onClick={() => sortBy("role")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "campus"} dir={sortDir} label="校区" onClick={() => sortBy("campus")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "remark"} dir={sortDir} label="备注名" onClick={() => sortBy("remark")} /></th>
                  <th className="px-4 py-3"><SortButton active={sortKey === "lastSignIn"} dir={sortDir} label="最近登录" onClick={() => sortBy("lastSignIn")} /></th>
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="bg-white transition hover:bg-pool-50/45">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">{account.fullName}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <UserRound size={13} />
                        {account.isCurrentUser ? "当前登录账号" : account.role === "student" ? "学员账号" : "工作账号"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-black text-ink">{displayAccount(account)}</td>
                    <td className="px-4 py-3">
                      <Badge className={roleTone(account.role)}>{roleLabel(account.role)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{account.campus ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {account.remarkName ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(account.lastSignInAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button className="h-9 rounded-xl px-3" disabled={isPending} onClick={() => openEdit(account)} type="button" variant="secondary">
                          <Pencil size={15} />
                          编辑
                        </Button>
                        <Button
                          className="h-9 rounded-xl px-3 text-red-600 hover:bg-red-50"
                          disabled={isPending || account.isCurrentUser}
                          onClick={() => removeAccount(account)}
                          type="button"
                          variant="secondary"
                        >
                          <Trash2 size={15} />
                          删除
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState detail="创建账号后，这里会显示短账号、角色和最近登录时间。" title="还没有可展示的账号" />
        )}
      </Panel>

      <Panel className="mt-6 p-5" title="账号规则">
        <div className="grid gap-3 text-sm font-semibold leading-6 text-slate-600 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <div className="font-black text-ink">管理员</div>
            <p className="mt-2">唯一账号固定是 `admin`。</p>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-black text-ink">
              <ShieldAlert size={18} />
              教练
            </div>
            <p className="mt-2">教练账号必须以 `jl` 开头，并填写和排课一致的教练名称。</p>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <div className="font-black text-ink">学员</div>
            <p className="mt-2">学员账号必须以 `xy` 开头，例如 `xy001`，并绑定学员档案。</p>
          </div>
        </div>
      </Panel>

      <Modal className="max-w-3xl" onClose={closeModal} open={open} title={editingAccount ? "编辑账号" : "添加账号"}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Field label="姓名">
            <input className={inputClass} defaultValue={editingAccount?.fullName ?? ""} name="fullName" placeholder="例如：王老师 / 张三" required />
          </Field>
          <Field hint="管理员 admin；教练 jl 开头；学员 xy 开头" label="登录账号">
            <input
              className={inputClass}
              defaultValue={editingAccount ? displayAccount(editingAccount) : ""}
              name="account"
              placeholder={editingAccount ? displayAccount(editingAccount) : "admin / jl001 / xy001"}
              required
            />
          </Field>
          <Field label="角色">
            <select className={inputClass} defaultValue={editingAccount?.role ?? "coach"} name="role">
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field hint="编辑时留空表示不修改原密码" label="密码">
            <input className={inputClass} name="password" placeholder={editingAccount ? "如需修改再填写" : "至少 4 位"} type="password" />
          </Field>
          <Field label="校区">
            <input className={inputClass} defaultValue={editingAccount?.campus ?? ""} name="campus" placeholder="例如：古北" />
          </Field>
          <Field hint="仅教练账号必填，必须与排课中的教练字段一致" label="教练名称">
            <input className={inputClass} defaultValue={editingAccount?.coachName ?? ""} name="coachName" placeholder="例如：古北教练" />
          </Field>
          <Field hint="用于区分重名学员或记录家长称呼，例如：小白妈妈" label="备注名">
            <input className={inputClass} defaultValue={editingAccount?.remarkName ?? ""} name="remarkName" placeholder="可选" />
          </Field>
          <Field hint="仅学员账号必选；学员只能看到该档案的数据" label="绑定学员">
            <select className={inputClass} defaultValue={editingAccount?.memberId ?? ""} name="memberId">
              <option value="">不绑定</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.chineseName} · #{member.memberNo} · {member.campus ?? "未填"}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button disabled={isPending} onClick={closeModal} type="button" variant="secondary">
              取消
            </Button>
            <Button disabled={isPending} type="submit">
              {isPending ? "保存中..." : editingAccount ? "保存修改" : "创建账号"}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
