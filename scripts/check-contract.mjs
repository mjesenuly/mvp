import fs from 'node:fs';import assert from 'node:assert/strict';
// JSON is a valid YAML 1.2 subset; keep the authoritative filename openapi.yml.
const doc = JSON.parse(fs.readFileSync('openapi.yml', 'utf8'));
assert.equal(doc.openapi, '3.1.0');
const ids = [];
for (const [path, item] of Object.entries(doc.paths)) {
  for (const [method, op] of Object.entries(item)) {
    assert(op.operationId);
    ids.push(op.operationId);
    for (const match of path.matchAll(/\{(\w+)\}/g)) {
      assert(op.parameters.some(p => p.in === 'path' && p.name === match[1] && p.required));
    }
    if (method !== 'get' && op.security.length) assert(op.parameters.some(p => p.name === 'X-CSRF-Token'));
    assert(op.responses['200']);
    // Every API operation uses the same fail-closed repository readiness gate.
    if (path !== '/api/health') {
      assert.equal(op.responses['503']?.content?.['application/json']?.schema?.$ref,
        '#/components/schemas/StorageUnavailableError', `${path}: missing storage-unavailable 503 response`);
      assert.equal(op.responses['503'].content['application/json'].example.code, 'STORAGE_UNAVAILABLE');
    }
  }
}
assert.equal(new Set(ids).size, ids.length);
for (const match of JSON.stringify(doc).matchAll(/#\/components\/schemas\/(\w+)/g)) assert(doc.components.schemas[match[1]], match[1]);
assert.equal(ids.length, 19);

// Regression guard: adding a storage mode or readiness behaviour in the server
// must also update its public contract, including the distinct health body.
const schemas = doc.components.schemas;
const health = doc.paths['/api/health'].get;
for (const [status, schemaName, state] of [['200', 'Health', 'ok'], ['503', 'HealthUnavailable', 'unavailable']]) {
  const response = health.responses[status]?.content?.['application/json'];
  assert.equal(response?.schema?.$ref, `#/components/schemas/${schemaName}`);
  const schema = schemas[schemaName];
  assert.deepEqual(schema.properties.storage.enum, ['memory', 'sqlite', 'postgres'], `${schemaName}: storage modes drifted`);
  assert.deepEqual(schema.properties.status.enum, [state]);
  assert.deepEqual([...schema.required].sort(), ['status', 'storage']);
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(response.example, { status: state, storage: 'postgres' });
}
assert.deepEqual(schemas.StorageUnavailableError.properties.code.enum, ['STORAGE_UNAVAILABLE']);
assert.deepEqual([...schemas.StorageUnavailableError.required].sort(), ['code', 'message']);
assert.equal(schemas.StorageUnavailableError.additionalProperties, false);
console.log(`Contract PASS: ${ids.length} unique operations; refs, path parameters, session, CSRF, PostgreSQL health and unavailable responses checked.`);
