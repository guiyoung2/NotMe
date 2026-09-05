import { describe, expect, it } from 'vitest';
import viteConfig from './vite.config';

describe('production Vite 설정', () => {
  it('Vercel 루트 경로를 기본 경로로 사용한다', async () => {
    const config = typeof viteConfig === 'function'
      ? await viteConfig({ command: 'build', mode: 'production', isSsrBuild: false, isPreview: false })
      : viteConfig;

    expect(config.base).toBe('/');
  });
});
