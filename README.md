# 游泳培训管理系统

Next.js + Supabase 版本的游泳培训机构运营后台。第一版使用 `出勤测试(2).xlsx` 生成首轮正式数据，包含学员、课程产品、排课、消课日志和教练手机出勤页。

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
npm run supabase:schema
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
- `/products`：课程产品，只读
- `/schedule`：排课表
- `/coach/today`：教练手机出勤
- `/attendance`：消课日志
- `/staff`：员工账号管理

除 `/` 和 `/login` 外，其余页面在 Supabase 模式下都要求登录。

## 登录规则

- 管理员账号固定为 `admin`
- 教练账号必须以 `jl` 开头，例如 `jl001`
- 前台账号必须以 `qt` 开头，例如 `qt001`

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

`npm run supabase:seed` 会至少创建 3 个账号：

- 管理员：默认 `admin`
- 前台：默认 `qt001`
- 教练：默认 `jl001`

默认密码都可以在 `.env.local` 里覆盖。

教练账号的 `profiles.coach_name` 会默认从 `src/data/seed.json` 中推断，确保它能直接看到自己名下的排课。

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

## 当前边界

- 首轮上线目标是 `Vercel + Supabase` 的真实试用环境。
- `products` 页首轮保持只读，不做产品后台维护。
- `src/data/seed.json` 和 Excel 原件用于本地初始化，不应提交到 GitHub。
