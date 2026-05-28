# 游泳培训管理系统

Next.js + Supabase 版本的游泳培训机构运营后台。第一版使用 `出勤测试(2).xlsx` 生成模拟数据，包含学员、课程产品、排课、消课日志、教练手机出勤页。

## 本地运行

```bash
npm install
npm run import:excel
npm run dev
```

打开 `http://localhost:3000`。

## 主要页面

- `/`：公开展示首页
- `/login`：员工登录入口
- `/dashboard`：运营概览
- `/members`：学员管理
- `/products`：课程产品
- `/schedule`：排课表
- `/coach/today`：手机端教练出勤
- `/attendance`：消课日志

## Supabase

1. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
2. 复制 `.env.example` 为 `.env.local`，填写：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

3. 当前页面默认读取 `src/data/seed.json` 演示数据；真实数据库读取可以在后续把 `src/lib/mock-data.ts` 替换为 Supabase 查询。

## Excel 导入

默认读取：

```bash
D:\课表\出勤测试(2).xlsx
```

如果文件位置变化：

```bash
$env:EXCEL_SOURCE_PATH="D:\path\to\file.xlsx"
npm run import:excel
```

导入脚本会读取：

- `出勤名单`
- `部分收费扣课信息`

并生成 `src/data/seed.json`。

## 第一版边界

- 组合姓名和括号备注姓名会原样保留，后续在后台人工合并。
- 演示模式下教练出勤只在前端立即反馈；配置 Supabase 后，Server Action 会调用 `mark_schedule_attended` RPC。
- Vercel 为第一部署目标。
