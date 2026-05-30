# ye-swim 部署与版本说明

当前应用版本：`0.0.2`

当前数据库版本：`0.0.4`

## 版本规则

- 应用版本写在 `package.json` 和 `src/lib/version.ts`。
- 数据库版本写在 `supabase/migrations/<编号>_v<版本>_<说明>/`。
- 每个数据库版本必须有：
  - `up.sql`：升级。
  - `down.sql`：回退。
- 已执行过的数据库版本记录在 Supabase 的 `app_meta.schema_migrations` 表。

## 本地升级数据库

需要先在 `.env.local` 填：

```bash
SUPABASE_DB_URL=
```

然后执行：

```bash
npm run db:migrate
```

旧命令也可以用：

```bash
npm run supabase:schema
```

它现在会走同一套迁移系统。

## 本地回退数据库

只有确认要回退时再执行：

```bash
$env:ROLLBACK_VERSION="0.0.2"
npm run db:rollback
```

注意：`0.0.2` 是 V3 基线版本。回退它会删除 V3 新表和字段，正式数据上线后不要随便回退基线。

## GitHub 自动升级数据库

项目已经添加 GitHub Actions：

- `.github/workflows/database-migrate.yml`
- `.github/workflows/database-rollback.yml`

你需要在 GitHub 设置一次 Secret：

1. 打开 GitHub 仓库。
2. 进入 `Settings`。
3. 左侧点 `Secrets and variables`。
4. 点 `Actions`。
5. 点 `New repository secret`。
6. 名字填：

```bash
SUPABASE_DB_URL
```

7. 内容填 Supabase 的数据库连接串。

之后只要推送到 `main`，并且这次提交改了 `supabase/migrations/**`，GitHub 会自动执行数据库迁移。

## GitHub 手动回退数据库

1. 打开 GitHub 仓库。
2. 点 `Actions`。
3. 选择 `Database Rollback`。
4. 点 `Run workflow`。
5. `version` 填要回退的版本，例如：

```bash
0.0.2
```

6. `confirm` 必须填：

```bash
ROLLBACK
```

## Spaceship 域名

你已经购买了 `yeats5.top`。

下一步不要急着乱改 DNS。我们先决定国内访问方案：

- 临时：Cloudflare CDN + Vercel 自定义域名。
- 更稳：腾讯云 CloudBase 或国内服务器。
- 最稳：国内服务器 + 自托管数据库 + ICP 备案。

等代码和数据库稳定后，再单独配置域名。
