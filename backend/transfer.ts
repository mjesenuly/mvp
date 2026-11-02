import { copyFile, access, constants, mkdtemp, readFile, rm, chmod } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { SqliteRepository } from './sqlite';
import type { StoredState } from './repository';
import type { PostgresRepository } from './postgres';
import { validateTerms } from '../frontend/src/service';

const canonical = (state: StoredState) => ({ ...state,
  accounts: [...state.accounts].sort((a, b) => a.id.localeCompare(b.id)),
  requests: [...state.requests].sort((a, b) => a.id.localeCompare(b.id)),
  offers: [...state.offers].sort((a, b) => a.id.localeCompare(b.id)),
  sessions: [...state.sessions].sort((a, b) => a.token.localeCompare(b.token)),
});

/** Refuse broken source relationships rather than migrate silently corrupted data. */
export function validateTransferState(state: StoredState) {
  const users = new Map(state.accounts.map(u => [u.id, u]));
  const requests = new Map(state.requests.map(r => [r.id, r]));
  const offers = new Map(state.offers.map(o => [o.id, o]));
  if (users.size !== state.accounts.length || requests.size !== state.requests.length || offers.size !== state.offers.length ||
      new Set(state.sessions.map(s => s.token)).size !== state.sessions.length) throw new Error('Duplicate source identifiers.');
  if (!Number.isSafeInteger(state.seq) || state.seq < 0) throw new Error('Invalid source sequence.');
  for (const request of state.requests) {
    if (users.get(request.ownerId)?.role !== 'customer') throw new Error('A request has no customer owner.');
    if (request.accepted) validateTerms(request.accepted);
    if (request.pending) validateTerms(request.pending);
    if (request.selectedId) {
      const selected = offers.get(request.selectedId);
      if (!selected || selected.requestId !== request.id || selected.withdrawn || !request.accepted) throw new Error('Invalid accepted offer relationship.');
    }
  }
  for (const offer of state.offers) {
    if (!requests.has(offer.requestId) || users.get(offer.workshopId)?.role !== 'workshop') throw new Error('An offer has an invalid request or workshop.');
    validateTerms(offer.terms);
  }
  for (const session of state.sessions) if (!users.has(session.userId)) throw new Error('A session has no account.');
}

/** Stop the SQLite app first. The source is never opened by the writable ORM:
 * a private backup and temporary copy are used, and existing targets are refused. */
export async function transferSqlite(source: string, backup: string, target: PostgresRepository) {
  if (path.resolve(source) === path.resolve(backup)) throw new Error('Backup must differ from source.');
  await access(source, constants.R_OK);
  const sourceBytes = await readFile(source);
  if (sourceBytes.subarray(0, 16).toString() !== 'SQLite format 3\u0000') throw new Error('Source is not a SQLite file.');
  if (!await target.isEmpty()) throw new Error('Target is not empty; transfer refused.');
  await copyFile(source, backup, constants.COPYFILE_EXCL);
  await chmod(backup, 0o600);
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'repairlens-transfer-'));
  let sqlite: SqliteRepository | undefined;
  try {
    const temporaryFile = path.join(temporary, 'source.sqlite');
    await copyFile(backup, temporaryFile);
    sqlite = await SqliteRepository.open(temporaryFile);
    const state = await sqlite.load();
    if (!state) throw new Error('Source has no initialized RepairLens state.');
    validateTransferState(state);
    // Recheck after reading; target lock is held throughout the operation.
    if (!await target.isEmpty()) throw new Error('Target changed during transfer.');
    await target.save(state);
    const restored = await target.load();
    assert.ok(restored);
    assert.deepEqual(canonical(restored), canonical(state));
    assert.deepEqual(await readFile(source), sourceBytes, 'Source changed during transfer; keep both databases offline.');
    return { accounts: state.accounts.length, requests: state.requests.length, offers: state.offers.length, sessions: state.sessions.length };
  } finally {
    await sqlite?.close();
    await rm(temporary, { recursive: true, force: true });
  }
}
