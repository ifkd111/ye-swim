import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { loadLocalEnv } from "./env";

loadLocalEnv();
dns.setDefaultResultOrder("ipv4first");

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  throw new Error("Missing SUPABASE_DB_URL in .env.local. Copy it from Supabase Project Settings > Database > Connection string.");
}

const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
const sql = fs.readFileSync(schemaPath, "utf8");
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("Supabase schema applied");
}

main().catch(async (error) => {
  await client.end().catch(() => undefined);
  console.error(error);
  process.exit(1);
});
