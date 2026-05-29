import { AppShell } from "@/components/site-shell";
import { Badge, Panel } from "@/components/ui";
import { getAppData } from "@/lib/data-source";
import { getProductTypeLabel } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { products, mode, viewer } = await getAppData();

  return (
    <AppShell
      title="课程产品"
      subtitle={mode === "supabase" ? "已连接 Supabase：产品来自数据库。" : "次卡扣课，月卡/集训/VIP 不扣课。"}
      viewerName={viewer.fullName}
      viewerRole={viewer.role}
    >
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
            </div>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
