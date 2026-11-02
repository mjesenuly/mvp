import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { PostgresRepository } from './postgres';

/** Tests never use the public application schema or DATABASE_URL implicitly. */
export async function isolatedPostgres() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL must point to a disposable PostgreSQL database.');
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  const repository = await PostgresRepository.open(url, schema);
  return {
    repository, url, schema,
    async cleanup() {
      await repository.close();
      const admin = new DataSource({ type: 'postgres', url });
      await admin.initialize();
      try { await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`); }
      finally { await admin.destroy(); }
    },
  };
}
