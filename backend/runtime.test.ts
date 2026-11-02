import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('production runtime serves static routes and drains on SIGTERM', { timeout: 20000 }, async () => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'backend/server.ts'], {
    env: { ...process.env, STORAGE: 'memory', PORT: '0', NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk.toString(); });
  const exited = once(child, 'exit');
  try {
    const base = await new Promise<string>((resolve, reject) => {
      child.stdout.on('data', chunk => {
        output += chunk.toString();
        const match = /http:\/\/localhost:(\d+)/.exec(output);
        if (match) resolve(`http://127.0.0.1:${match[1]}`);
      });
      child.once('error', reject);
      child.once('exit', () => reject(new Error(`Runtime exited before ready: ${errors}`)));
    });
    const health = await fetch(base + '/api/health');
    assert.equal(health.status, 200);
    const index = await fetch(base + '/');
    assert.equal(index.status, 200);
    const html = await index.text();
    assert.match(html, /RepairLens/);
    const asset = /src="([^"]+\.js)"/.exec(html)?.[1];
    assert.ok(asset, 'built frontend must reference a JavaScript asset');
    assert.equal((await fetch(base + asset)).status, 200);
    const route = await fetch(base + '/requests/example');
    assert.equal(route.status, 200);
    assert.match(route.headers.get('content-type') ?? '', /text\/html/);
    const missing = await fetch(base + '/api/not-a-route');
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).code, 'NOT_FOUND');
    child.kill('SIGTERM');
    const [code, signal] = await exited;
    assert.equal(code, 0, errors);
    assert.equal(signal, null);
    assert.match(output, /RepairLens stopped/);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
});
