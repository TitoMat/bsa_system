import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource, DataSourceOptions } from 'typeorm';
import { databaseEntities } from './entities';

function loadEnvFile() {
  const appEnv = process.env.APP_ENV;
  const candidates = [
    appEnv ? `.env.${appEnv}` : undefined,
    '.env.local',
    '.env',
  ].filter((item): item is string => Boolean(item));

  for (const fileName of candidates) {
    const filePath = path.resolve(process.cwd(), fileName);

    if (!fs.existsSync(filePath)) continue;

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) continue;

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1);

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    return;
  }
}

loadEnvFile();

/**
 * Schema synchronization policy (R0A fleet refactor safety pass):
 *
 * - Production MUST NEVER synchronize: even if TYPEORM_SYNCHRONIZE=true leaks
 *   into the production environment, NODE_ENV=production forces it off.
 * - Development may still opt in with TYPEORM_SYNCHRONIZE=true until the first
 *   real migration is generated from the current schema. This is a temporary
 *   bootstrap convenience, not the long-term strategy.
 *
 * This helper is the single source of truth used by BOTH the application
 * runtime (app.module.ts) and the migration CLI (data-source.ts).
 */
export function resolveSynchronize(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.NODE_ENV === 'production') return false;
  return env.TYPEORM_SYNCHRONIZE === 'true';
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: Number(process.env.DATABASE_PORT || 5432),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || undefined,
  database: process.env.DATABASE_NAME || 'bsa_local',
  entities: databaseEntities,
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: resolveSynchronize(),
};

export default new DataSource(dataSourceOptions);
