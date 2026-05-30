import { createDbClient, readAppliedVersions, readMigrations, readSql } from "./db-utils";

async function main() {
  const client = createDbClient();
  await client.connect();

  try {
    const migrations = readMigrations();
    const applied = await readAppliedVersions(client);
    const pending = migrations.filter((migration) => !applied.has(migration.version));

    if (pending.length === 0) {
      console.log("Database is already up to date.");
      return;
    }

    for (const migration of pending) {
      console.log(`Applying ${migration.dir}`);
      await client.query("begin");
      try {
        await client.query(readSql(migration.upPath));
        await client.query(
          `
            insert into app_meta.schema_migrations (version, name)
            values ($1, $2)
            on conflict (version) do nothing
          `,
          [migration.version, migration.name]
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    console.log(`Applied ${pending.length} migration(s).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
