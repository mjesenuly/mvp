import 'dotenv/config';import{SqliteRepository}from'./sqlite';
const file=process.env.DATABASE_FILE??'.data/repairlens.sqlite';const repository=await SqliteRepository.open(file);console.log(`Migrations complete for ${file}; pending: ${await repository.db.showMigrations()}`);await repository.close();
