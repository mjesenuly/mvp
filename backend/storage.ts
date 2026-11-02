import { MemoryRepository, type StateRepository } from './repository';

/** Explicit storage selection: unknown modes fail instead of losing data in memory. */
export async function openRepository(env = process.env): Promise<StateRepository> {
  const storage = env.STORAGE ?? 'memory';
  if (storage === 'memory') return new MemoryRepository();
  if (storage === 'sqlite') return (await import('./sqlite')).SqliteRepository.open(env.DATABASE_FILE ?? '.data/repairlens.sqlite');
  if (storage === 'postgres') {
    if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required for STORAGE=postgres.');
    return (await import('./postgres')).PostgresRepository.open(env.DATABASE_URL, env.DATABASE_SCHEMA ?? 'public');
  }
  throw new Error(`Unsupported STORAGE mode: ${storage}`);
}
