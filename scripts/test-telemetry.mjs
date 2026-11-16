import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';

test('exports correlated metrics, traces and logs through OTLP', { timeout: 35_000 }, async t => {
  const exports = new Map();
  const collector = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString());
    exports.set(req.url, [...(exports.get(req.url) ?? []), payload]);
    res.writeHead(200, { 'content-type': 'application/json' }).end('{}');
  });
  collector.listen(0, '127.0.0.1');
  await once(collector, 'listening');
  t.after(() => collector.close());

  const child = spawn(process.execPath, ['--import', 'tsx', 'backend/server.ts'], {
    env: {
      ...process.env,
      PORT: '0', STORAGE: 'memory',
      OTEL_EXPORTER_OTLP_ENDPOINT: `http://127.0.0.1:${collector.address().port}`,
      DEPLOYMENT_ENVIRONMENT: 'development',
      RENDER_GIT_COMMIT: 'a'.repeat(40),
    },
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const closed = once(child, 'close');
  t.after(() => child.kill('SIGKILL'));
  const port = await new Promise((resolve, reject) => {
    child.stdout.setEncoding('utf8');
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = /http:\/\/localhost:(\d+)/.exec(output);
      if (match) resolve(match[1]);
    });
    child.once('error', reject);
    child.once('exit', code => reject(new Error(`Server exited with code ${code}`)));
  });

  const base = `http://localhost:${port}`;
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-repairlens-commit'), 'a'.repeat(40));
  const registration = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Telemetry Test', email: 'otel@example.test', password: 'test-password',
      role: 'customer', contact: 'private contact',
    }),
  });
  assert.equal(registration.status, 200);
  const { csrfToken } = await registration.json();
  const request = await fetch(`${base}/api/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      Cookie: registration.headers.get('set-cookie').split(';')[0],
    },
    body: JSON.stringify({
      category: 'Smartphone', brand: 'Example', model: 'Demo',
      fault: 'private fault description', city: 'Almaty',
    }),
  });
  assert.equal(request.status, 200, await request.text());

  for (let attempt = 0; attempt < 60 && !exports.has('/v1/metrics'); attempt++) await delay(250);
  child.kill('SIGTERM');
  assert.equal((await closed)[0], 0);

  const metricSets = exports.get('/v1/metrics')?.flatMap(payload => payload.resourceMetrics) ?? [];
  const metrics = metricSets.flatMap(set => set.scopeMetrics.flatMap(scope => scope.metrics));
  const counter = metrics.find(metric => metric.name === 'repairlens_requests_created');
  assert.ok(counter);
  assert.equal(Number(counter.sum.dataPoints[0].asInt ?? counter.sum.dataPoints[0].asDouble), 1);
  assert.ok(metrics.some(metric => metric.name === 'repairlens_api_duration'));

  const traceSets = exports.get('/v1/traces')?.flatMap(payload => payload.resourceSpans) ?? [];
  const spans = traceSets.flatMap(set => set.scopeSpans.flatMap(scope => scope.spans));
  const span = spans.find(item => item.name === 'POST /api/requests');
  assert.ok(span);
  const logSets = exports.get('/v1/logs')?.flatMap(payload => payload.resourceLogs) ?? [];
  const records = logSets.flatMap(set => set.scopeLogs.flatMap(scope => scope.logRecords));
  assert.ok(records.some(record => record.traceId === span.traceId && record.spanId === span.spanId));
  assert.doesNotMatch(JSON.stringify([...exports.values()]), /private fault|private contact|otel@example/);
});
