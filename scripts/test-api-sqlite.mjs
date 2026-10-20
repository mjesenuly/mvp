import{spawnSync}from'node:child_process';
const result=spawnSync(process.execPath,['--import','tsx','--test','backend/server.test.ts'],{stdio:'inherit',env:{...process.env,TEST_STORAGE:'sqlite'}});process.exit(result.status??1);
