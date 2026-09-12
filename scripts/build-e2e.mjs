import { spawnSync } from 'node:child_process';

if (!process.env.npm_execpath) throw new Error('npm 실행 경로를 찾을 수 없습니다.');

const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, 'run', 'build'],
  {
    env: { ...process.env, VITE_E2E: 'true' },
    stdio: 'inherit',
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
