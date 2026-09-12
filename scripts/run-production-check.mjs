import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const playwrightCli = fileURLToPath(new URL('../node_modules/@playwright/test/cli.js', import.meta.url));
const result = spawnSync(
  process.execPath,
  [playwrightCli, 'test', 'e2e/marble.spec.ts', '--grep', '빌드 설정'],
  {
    env: { ...process.env, NOTME_PRODUCTION_CHECK: 'true' },
    stdio: 'inherit',
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
