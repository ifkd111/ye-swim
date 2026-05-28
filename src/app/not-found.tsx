import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <h1 className="text-3xl font-semibold text-ink">页面不存在</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">返回后台继续查看学员、排课和消课记录。</p>
      <ButtonLink href="/dashboard" className="mt-6">
        回到后台
      </ButtonLink>
    </main>
  );
}
