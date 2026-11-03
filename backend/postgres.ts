import 'reflect-metadata';
import { DataSource, type QueryRunner } from 'typeorm';
import { InitialRepairLens1760950000000, repairEntities } from './sqlite';
import type { StateRepository, StoredState } from './repository';

/** The existing domain caches whole aggregates. A session lock deliberately
 * permits one application writer, rather than silently losing cross-process writes. */
export class PostgresRepository implements StateRepository {
  readonly kind = 'postgres' as const;
  private available = true;
  private handoff?: () => void;
  onHandoff(callback: () => void) { this.handoff = callback; }
  private constructor(public db: DataSource, private runner: QueryRunner) {}

  static async open(url: string, schema = 'public') {
    if (!/^postgres(?:ql)?:\/\//.test(url)) throw new Error('A PostgreSQL DATABASE_URL is required.');
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema)) throw new Error('Invalid PostgreSQL schema name.');
    const db = new DataSource({
      type: 'postgres', url, schema, entities: repairEntities,
      migrations: [InitialRepairLens1760950000000], synchronize: false,
      logging: false, extra: { max: 2, connectionTimeoutMillis: 5000 },
    });
    await db.initialize();
    const runner = db.createQueryRunner();
    try {
      const client = await runner.connect();
      // The dedicated client must never be transparently replaced: its session
      // owns the advisory lock. A connection error permanently fails this instance.
      const repository = new PostgresRepository(db, runner);
      client.on('error', () => { repository.available = false; });
      const [lock] = await runner.query(
        'SELECT pg_try_advisory_lock(hashtext(current_database()), hashtext($1)) AS acquired',
        [`repairlens:${schema}`],
      );
      if (!lock.acquired) {
        // Render starts the replacement before stopping the live instance. In
        // handoff mode, ask the old writer to drain and release its session lock.
        // Never bypass the lock: the application caches complete aggregates.
        if (process.env.RENDER_DEPLOY_HANDOFF === '1') {
          await runner.query('SELECT pg_notify($1, $2)', ['repairlens_writer_handoff', schema]);
          const deadline = Date.now() + 75000;
          let acquired = false;
          while (Date.now() < deadline) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const [retry] = await runner.query(
              'SELECT pg_try_advisory_lock(hashtext(current_database()), hashtext($1)) AS acquired',
              [`repairlens:${schema}`],
            );
            if (retry.acquired) { acquired = true; break; }
          }
          if (!acquired) throw new Error('Timed out waiting for previous RepairLens writer to release its PostgreSQL lock.');
        } else {
          throw new Error('Another RepairLens writer already owns this database/schema.');
        }
      }
      await runner.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
      // TypeORM migration operations use the configured schema; this search path
      // also keeps raw readiness queries and future migration SQL predictable.
      await runner.query(`SET search_path TO "${schema}"`);
      await db.runMigrations({ transaction: 'all' });
      if (process.env.RENDER_DEPLOY_HANDOFF === '1') {
        client.on('notification', (message: { channel: string; payload?: string }) => {
          if (message.channel === 'repairlens_writer_handoff' && message.payload === schema) {
            repository.handoff?.();
          }
        });
        await runner.query('LISTEN repairlens_writer_handoff');
      }
      return repository;
    } catch (error) {
      await runner.release().catch(() => {});
      await db.destroy();
      throw error;
    }
  }

  async ready() {
    if (!this.available || this.runner.isReleased) throw new Error('PostgreSQL writer connection is unavailable; restart the application.');
    try { await this.runner.query('SELECT 1'); }
    catch (error) { this.available = false; throw error; }
  }

  async load(): Promise<StoredState | null> {
    await this.ready();
    const meta = await this.runner.manager.getRepository('StateMeta').findOneBy({ id: 'sequence' });
    if (!meta) return null;
    const read = async (name: string) => (await this.runner.manager.getRepository(name).find()).map(row => JSON.parse(row.payload));
    return {
      accounts: await read('Account'), requests: await read('RepairAggregate'),
      offers: await read('OfferAggregate'), sessions: await read('StoredSession'),
      seq: JSON.parse(meta.payload),
    };
  }

  async save(state: StoredState) {
    await this.ready();
    await this.runner.startTransaction();
    try {
      const manager = this.runner.manager;
      for (const name of ['Account', 'RepairAggregate', 'OfferAggregate', 'StoredSession', 'StateMeta']) {
        await manager.createQueryBuilder().delete().from(name).execute();
      }
      const save = async (name: string, rows: unknown[]) => { if (rows.length) await manager.getRepository(name).save(rows); };
      await save('Account', state.accounts.map(u => ({ id: u.id, email: u.email, payload: JSON.stringify(u) })));
      await save('RepairAggregate', state.requests.map(r => ({ id: r.id, ownerId: r.ownerId, status: r.status, payload: JSON.stringify(r) })));
      await save('OfferAggregate', state.offers.map(o => ({
        id: o.id, requestId: o.requestId, workshopId: o.workshopId,
        activeKey: o.withdrawn ? null : `${o.requestId}:${o.workshopId}`, payload: JSON.stringify(o),
      })));
      await save('StoredSession', state.sessions.map(s => ({ id: s.token, userId: s.userId, payload: JSON.stringify(s) })));
      await save('StateMeta', [{ id: 'sequence', payload: JSON.stringify(state.seq) }]);
      await this.runner.commitTransaction();
    } catch (error) {
      await this.runner.rollbackTransaction().catch(() => { this.available = false; });
      throw error;
    }
  }

  /** Used only by explicit migration tooling; application startup never deletes data. */
  async isEmpty() {
    await this.ready();
    for (const name of ['Account', 'RepairAggregate', 'OfferAggregate', 'StoredSession', 'StateMeta']) {
      if (await this.runner.manager.getRepository(name).count()) return false;
    }
    return true;
  }

  async close() {
    this.available = false;
    if (!this.runner.isReleased) {
      // Release is not enough: pooled clients retain session advisory locks.
      await this.runner.query('SELECT pg_advisory_unlock_all()').catch(() => {});
      await this.runner.release().catch(() => {});
    }
    if (this.db.isInitialized) await this.db.destroy();
  }
}
