# 游泳培训管理系统

Next.js + Supabase 版本的游泳培训机构运营后台。V3 以管理员老板、教练、学员三角色为主线，包含学员账号、课程申请、教练空余时间、预约审批、正式排课和教练出勤。

当前应用版本：`0.0.3`。

## 本地启动顺序

1. 克隆仓库并恢复本地私有文件：

```bash
git clone https://github.com/ifkd111/ye-swim.git
```

需要从私有备份恢复：

- `.env.local`
- `src/data/seed.json`
- `出勤测试(2).xlsx`

2. 安装依赖：

```bash
npm install
```

3. 初始化 Supabase schema 和试用账号：

```bash
npm run db:migrate
npm run supabase:seed
```

4. 验证类型和构建：

```bash
npm run typecheck
npm run build
```

5. 启动本地开发：

```bash
npm run dev
```

打开 `http://localhost:3000`。

## 页面说明

- `/`：公开首页
- `/login`：员工登录入口
- `/dashboard`：运营概览
- `/members`：学员管理
- `/products`：课程产品维护
- `/availability`：教练空余时间，管理员决定是否发布给学员
- `/booking-requests`：学员预约审批，通过后生成正式排课
- `/course-applications`：课程/续费申请审批
- `/schedule`：排课表
- `/coach/today`：教练手机出勤
- `/student`：学员自助页面
- `/attendance`：消课日志
- `/staff`：账号管理

除 `/` 和 `/login` 外，其余页面在 Supabase 模式下都要求登录。

## 登录规则

- 管理员账号固定为 `admin`
- 教练账号必须以 `jl` 开头，例如 `jl001`
- 学员账号必须以 `xy` 开头，例如 `xy001`，并在 `/staff` 绑定学员档案

前端登录时直接输入短账号，不需要记邮箱。

## Supabase 配置

`.env.local` 至少需要：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
```

说明：

- `SUPABASE_SERVICE_ROLE_KEY` 和 `SUPABASE_DB_URL` 只用于本地初始化，不需要放到 Vercel。
- 如果你希望线上 `/staff` 页面也能直接创建员工账号，Vercel 服务端环境中也必须配置 `SUPABASE_SERVICE_ROLE_KEY`。

## 首轮试用账号

`npm run supabase:seed` 会至少创建 2 个工作账号：

- 管理员：默认 `admin`
- 教练：默认 `jl001`

默认密码都可以在 `.env.local` 里覆盖。

教练账号的 `profiles.coach_name` 会默认从 `src/data/seed.json` 中推断，确保它能直接看到自己名下的排课。

学员账号由管理员在 `/staff` 手动创建并绑定学员档案。

## 预约规则

- 所有学员预约按 `Asia/Shanghai` 时间判断。
- 学员不能预约当天课程。
- 当天 20:00 前，最早可申请明天课程。
- 当天 20:00 后，最早只能申请后天课程。
- 管理员手动排课不受该限制，用于特殊情况。

## Excel 导入

默认读取仓库根目录下的：

```bash
出勤测试(2).xlsx
```

如需改路径：

```bash
$env:EXCEL_SOURCE_PATH="D:\path\to\file.xlsx"
npm run import:excel
```

导入脚本会读取：

- `出勤名单`
- `部分收费扣课信息`

并生成 `src/data/seed.json`。

## 数据库版本

- 迁移文件在 `supabase/migrations`。
- 已执行版本记录在数据库 `app_meta.schema_migrations`。
- `npm run db:migrate` 执行升级。
- `npm run db:rollback` 按 `ROLLBACK_VERSION` 回退一个版本。
- GitHub Actions 已配置自动迁移和手动回退，详见 `DEPLOY_CN.md`。

## 当前边界

- 首轮上线目标是 V3 真实试用环境。
- 国内访问挂载点、Cloudflare、CloudBase、Spaceship 域名等代码通过后再单独处理。
- `src/data/seed.json` 和 Excel 原件用于本地初始化，不应提交到 GitHub。
