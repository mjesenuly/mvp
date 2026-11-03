import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import path from 'node:path';

if (process.env.CI) throw new Error('The SQLite browser diagnostic is local-only; CI must use PostgreSQL Compose.');
await access('dist/index.html');
const reservation = createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
const temporary = await mkdtemp(path.join(os.tmpdir(), 'repairlens-browser-diagnostic-'));
const origin = `http://localhost:${port}`;
const server = spawn(process.execPath, ['--import', 'tsx', 'backend/server.ts'], {
  stdio: 'inherit',
  env: { ...process.env, STORAGE: 'sqlite', DATABASE_FILE: path.join(temporary, 'diagnostic.sqlite'),
    PORT: String(port), APP_ORIGIN: origin, NODE_ENV: 'development',
    ADMIN_EMAIL: 'admin@example.test', ADMIN_PASSWORD: 'AdminPass123!' },
});

let exitCode = 1;
try {
  let healthy = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null || server.signalCode !== null) throw new Error('Diagnostic backend exited before readiness.');
    try {
      const response = await fetch(origin + '/api/health', { signal: AbortSignal.timeout(1000) });
      const health = await response.json();
      if (response.ok && health.status === 'ok' && health.storage === 'sqlite') { healthy = true; break; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!healthy) throw new Error('Diagnostic backend was not ready within the startup deadline.');
  console.log('LOCAL DIAGNOSTIC ONLY: real browser + built HTTP app + temporary SQLite. This is not PostgreSQL/Compose evidence.');
  const tests = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, E2E_BASE_URL: origin, E2E_EXPECT_STORAGE: 'sqlite' },
  });
  const [code] = await once(tests, 'exit');
  exitCode = code ?? 1;
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    const stopped = once(server, 'exit');
    server.kill('SIGTERM');
    await stopped;
  }
  await rm(temporary, { recursive: true, force: true });
}
process.exitCode = exitCode;
