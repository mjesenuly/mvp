import { spawnSync } from 'node:child_process';
if (!process.env.TEST_DATABASE_URL) {
  console.error('TEST_DATABASE_URL is required and must name a disposable real PostgreSQL database.');
  process.exit(1);
}
for (const file of ['backend/postgres.test.ts', 'backend/server.test.ts']) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', file], {
    stdio: 'inherit', env: { ...process.env, TEST_STORAGE: 'postgres' },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
