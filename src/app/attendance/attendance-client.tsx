"use client";

import { RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AttendanceTable } from "@/components/data-table";
import { AppShell } from "@/components/site-shell";
import { Button, Panel } from "@/components/ui";
import { useRecords, storageKeys } from "@/hooks/use-local-records";
import type { DataMode } from "@/lib/data-source";
import type { AttendanceLog } from "@/lib/types";

export function AttendanceClient({ initialLogs, dataMode }: { initialLogs: AttendanceLog[]; dataMode: DataMode }) {
  const { records: logs, reset } = useRecords(storageKeys.attendance, initialLogs, dataMode === "demo");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return logs;
    return logs.filter((log) =>
      [log.attendanceDate, log.memberName, log.coach, log.campus, log.sourceNote, log.source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [logs, query]);

  return (
    <AppShell
      title="消课记录"
      subtitle={dataMode === "supabase" ? "已连接 Supabase：消课日志来自数据库。" : "排课页或教练页勾选出勤后，会即时写入这里的本地日志。"}
    >
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-13 w-full rounded-3xl border border-slate-200 bg-white py-4 pl-11 pr-4 text-sm font-bold text-ink shadow-line outline-none transition focus:border-pool-500 focus:ring-4 focus:ring-pool-100"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索学员、校区、教练、来源"
            value={query}
          />
        </label>
        <Button className="h-13" disabled={dataMode === "supabase"} onClick={reset} variant="secondary">
          <RotateCcw size={18} />
          重置日志
        </Button>
      </div>
      <Panel action={<span className="text-sm font-bold text-slate-500">{filtered.length} 条</span>} title="消课日志">
        <AttendanceTable logs={filtered.slice(0, 300)} />
      </Panel>
    </AppShell>
  );
}
