"use client";

import { Download, FileCheck2, UploadCloud } from "lucide-react";
import { FormEvent, useMemo, useRef, useState, useTransition } from "react";
import { importStandardWorkbookAction, validateStandardImportAction } from "@/app/imports/actions";
import { compareValues, SkeletonRows, SortButton, type SortDir } from "@/components/data-table";
import { AppShell } from "@/components/site-shell";
import { Badge, Button, ButtonLink, EmptyState, Panel, StatCard } from "@/components/ui";
import type { ImportIssue } from "@/lib/standard-import";
import type { UserRole } from "@/lib/types";

type ActionResult = {
  ok: boolean;
  message: string;
  stats?: {
    members: number;
    schedules: number;
    attendanceLogs: number;
    skippedSchedules: number;
  };
  errors?: ImportIssue[];
  warnings?: ImportIssue[];
};

const memberHeaders = ["姓名*", "英文名", "性别", "手机号", "微信", "校区", "教练", "课程类型*", "产品名称", "总课时", "开卡日期", "到期日期", "备注"];
const scheduleHeaders = ["日期*", "时间*", "校区*", "教练*", "学员姓名*", "状态", "备注"];
const attendanceHeaders = ["日期*", "学员姓名*", "教练", "校区", "扣课数", "来源备注"];

function IssueTable({ issues, loading }: { issues: ImportIssue[]; loading: boolean }) {
  type Key = "level" | "sheet" | "row" | "field" | "message";
  const [sortKey, setSortKey] = useState<Key>("sheet");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function sortBy(key: Key) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const rows = useMemo(() => {
    const pick: Record<Key, (issue: ImportIssue) => unknown> = {
      level: (issue) => (issue.message.includes("警告") ? "警告" : "提示"),
      sheet: (issue) => issue.sheet ?? "",
      row: (issue) => issue.row ?? 0,
      field: (issue) => issue.field ?? "",
      message: (issue) => issue.message
    };
    return [...issues].sort((a, b) => compareValues(pick[sortKey](a), pick[sortKey](b), sortDir));
  }, [issues, sortDir, sortKey]);

  const headers: Array<[Key, string]> = [
    ["level", "类型"],
    ["sheet", "工作表"],
    ["row", "行号"],
    ["field", "字段"],
    ["message", "说明"]
  ];

  return (
    <div className="soft-scrollbar overflow-x-auto">
      <table className="min-w-[880px] text-left text-sm">
        <thead className="border-b border-white/[0.08] bg-[#131e33] text-xs uppercase text-slate-500">
          <tr>
            {headers.map(([key, label]) => (
              <th className="px-4 py-3" key={key}>
                <SortButton active={sortKey === key} dir={sortDir} label={label} onClick={() => sortBy(key)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.08]">
          {loading ? (
            <SkeletonRows columns={5} rows={6} />
          ) : (
            rows.map((issue, index) => (
              <tr className="bg-[#0c1525]" key={`${issue.sheet}-${issue.row}-${issue.field}-${index}`}>
                <td className="px-4 py-3">
                  <Badge className={issue.message.includes("警告") ? "border-amber-400/30 bg-amber-500/10 text-amber-300" : "border-red-400/30 bg-red-500/10 text-red-300"}>
                    {issue.message.includes("警告") ? "警告" : "校验"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-300">{issue.sheet ?? "-"}</td>
                <td className="px-4 py-3 text-slate-300">{issue.row ?? "-"}</td>
                <td className="px-4 py-3 text-slate-300">{issue.field ?? "-"}</td>
                <td className="px-4 py-3 text-slate-300">{issue.message}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function HeaderBand({ title, headers }: { title: string; headers: string[] }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#131e33] p-4">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {headers.map((header) => (
          <span className="rounded-md border border-white/[0.08] bg-[#0c1525] px-2.5 py-1 text-xs font-semibold text-slate-400" key={header}>
            {header}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ImportsClient({
  viewerName,
  viewerRole,
  mode
}: {
  viewerName: string | null;
  viewerRole: UserRole | null;
  mode: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const issues = [...(result?.errors ?? []), ...(result?.warnings ?? []).map((warning) => ({ ...warning, message: `警告：${warning.message}` }))];
  const canImport = mode === "supabase" && viewerRole === "admin";

  function submit(event: FormEvent<HTMLFormElement>, intent: "validate" | "import") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const nextResult = intent === "validate" ? await validateStandardImportAction(form) : await importStandardWorkbookAction(form);
      setResult(nextResult);
    });
  }

  function importCurrentFile() {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    startTransition(async () => {
      setResult(await importStandardWorkbookAction(formData));
    });
  }

  return (
    <AppShell
      title="表格导入"
      subtitle="先下载标准模板，上传后会校验学员、排课、消课之间的关联，再写入系统。"
      viewerName={viewerName}
      viewerRole={viewerRole}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="学员" value={String(result?.stats?.members ?? 0)} detail="新增或更新档案" />
        <StatCard label="排课" value={String(result?.stats?.schedules ?? 0)} detail={`跳过重复 ${result?.stats?.skippedSchedules ?? 0}`} />
        <StatCard label="消课" value={String(result?.stats?.attendanceLogs ?? 0)} detail="次卡扣课，其他卡不扣" />
        <StatCard label="校验" value={result ? (result.ok ? "通过" : "未过") : "待上传"} detail={result?.message ?? "下载模板后填写"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="上传 Excel">
          <form className="grid gap-4 p-4" onSubmit={(event) => submit(event, "validate")} ref={formRef}>
            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-400/30 bg-cyan-400/5 p-5 text-center transition hover:border-cyan-300/60">
              <UploadCloud className="text-cyan-300" size={32} />
              <span className="mt-3 text-sm font-semibold text-slate-100">选择标准导入表格</span>
              <span className="mt-1 text-xs font-medium text-slate-500">支持 .xlsx，表头必须和模板一致</span>
              <input accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" name="file" required type="file" />
            </label>

            {!canImport ? (
              <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">
                当前环境需要使用 Supabase 管理员账号才能导入。演示模式仍可下载模板和查看格式。
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <Button disabled={isPending || !canImport} type="submit" variant="secondary">
                <FileCheck2 size={17} />
                {isPending ? "校验中" : "校验"}
              </Button>
              <Button
                disabled={isPending || !canImport}
                onClick={importCurrentFile}
                type="button"
              >
                <UploadCloud size={17} />
                {isPending ? "导入中" : "导入"}
              </Button>
              <ButtonLink href="/imports/template" variant="secondary">
                <Download size={17} />
                模板
              </ButtonLink>
            </div>
          </form>
        </Panel>

        <Panel title="标准表头">
          <div className="grid gap-3 p-4">
            <HeaderBand headers={memberHeaders} title="学员 Sheet" />
            <HeaderBand headers={scheduleHeaders} title="排课 Sheet" />
            <HeaderBand headers={attendanceHeaders} title="消课 Sheet" />
          </div>
        </Panel>
      </div>

      <Panel className="mt-6" action={<span className="text-sm font-semibold text-slate-500">{issues.length} 条</span>} title="校验结果">
        {result || isPending ? (
          <IssueTable issues={issues} loading={isPending} />
        ) : (
          <EmptyState title="还没有校验结果" detail="上传表格后，这里会列出缺失表头、日期格式、学员关联和课程类型问题。" />
        )}
      </Panel>
    </AppShell>
  );
}
