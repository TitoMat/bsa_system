'use strict';

// Runs TypeORM migrations from the compiled dist output so the production
// container (npm ci --omit=dev, no ts-node) can migrate without the dev CLI.
// Usage (inside the backend container): node scripts/run-migrations.js

const path = require('path');
const { DataSource } = require('typeorm');
const { dataSourceOptions } = require(path.join(__dirname, '..', 'dist', 'database', 'data-source.js'));

async function main() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  const applied = await dataSource.runMigrations();

  if (applied.length > 0) {
    console.log('Applied migrations:');
    for (const migration of applied) {
      console.log(`  ${migration.name}`);
    }
  } else {
    console.log('No pending migrations.');
  }

  await dataSource.destroy();
}

main().catch((error) => {
  console.error('Migration run failed:', error);
  process.exit(1);
});