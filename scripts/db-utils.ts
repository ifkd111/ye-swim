import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { loadLocalEnv } from "./env";

export type Migration = {
  dir: string;
  id: string;
  version: string;
  name: string;
  upPath: string;
  downPath: string;
};

loadLocalEnv();
dns.setDefaultResultOrder("ipv4first");

export const migrationsDir = path.join(process.cwd(), "supabase", "migrations");

export function getDatabaseUrl() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    throw new Error("Missing SUPABASE_DB_URL. Add it to .env.local locally or GitHub Actions secrets online.");
  }
  return dbUrl;
}

export function createDbClient() {
  return new pg.Client({
    connectionString: getDatabaseUrl(),
    ssl: {
      rejectUnauthorized: false
    }
  });
}

export function parseMigrationDir(dir: string) {
  const match = dir.match(/^(\d+)_v(\d+\.\d+\.\d+)_(.+)$/);
  if (!match) {
    throw new Error(`Invalid migration folder name: ${dir}. Use 0001_v0.0.2_short_name.`);
  }

  return {
    id: match[1],
    version: match[2],
    name: match[3].replace(/_/g, " ")
  };
}

export function readMigrations(): Migration[] {
  if (!fs.existsSync(migrationsDir)) return [];

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .map((item) => {
      const parsed = parseMigrationDir(item.name);
      const dirPath = path.join(migrationsDir, item.name);
      const upPath = path.join(dirPath, "up.sql");
      const downPath = path.join(dirPath, "down.sql");

      if (!fs.existsSync(upPath)) {
        throw new Error(`Missing migration up.sql: ${upPath}`);
      }

      if (!fs.existsSync(downPath)) {
        throw new Error(`Missing migration down.sql: ${downPath}`);
      }

      return {
        dir: item.name,
        id: parsed.id,
        version: parsed.version,
        name: parsed.name,
        upPath,
        downPath
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function readSql(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

export async function ensureMigrationTable(client: pg.Client) {
  await client.query(`
    create schema if not exists app_meta;
    create table if not exists app_meta.schema_migrations (
      version text primary key,
      name text not null,
      applied_at timestamptz not null default now()
    );
  `);
}

export async function readAppliedVersions(client: pg.Client) {
  await ensureMigrationTable(client);
  const result = await client.query<{ version: string }>(
    "select version from app_meta.schema_migrations order by applied_at asc"
  );
  return new Set(result.rows.map((row) => row.version));
}
