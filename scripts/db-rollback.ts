import { createDbClient, readAppliedVersions, readMigrations, readSql } from "./db-utils";

function targetVersion() {
  return process.env.ROLLBACK_VERSION?.trim();
}

async function main() {
  const version = targetVersion();
  if (!version) {
    throw new Error("Missing ROLLBACK_VERSION. Example: ROLLBACK_VERSION=0.0.2 npm run db:rollback");
  }

  const client = createDbClient();
  await client.connect();

  try {
    const migrations = readMigrations();
    const target = migrations.find((migration) => migration.version === version);
    if (!target) {
      throw new Error(`Unknown migration version: ${version}`);
    }

    const applied = await readAppliedVersions(client);
    if (!applied.has(version)) {
      console.log(`Migration ${version} is not applied; nothing to roll back.`);
      return;
    }

    console.log(`Rolling back ${target.dir}`);
    await client.query("begin");
    try {
      await client.query(readSql(target.downPath));
      await client.query("delete from app_meta.schema_migrations where version = $1", [version]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }

    console.log(`Rolled back ${target.dir}.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
