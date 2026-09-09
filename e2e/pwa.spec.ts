import { expect, test } from '@playwright/test';

test('설치 정보와 활성 서비스 워커를 제공한다', async ({ page }) => {
  await page.goto('/');
  const manifestPath = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestPath).toBeTruthy();
  const manifestResponse = await page.request.get(manifestPath!);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: 'NotMe',
    short_name: 'NotMe',
    start_url: '/',
    scope: '/',
    display: 'standalone',
  });
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
    expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
    expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
  ]));
  for (const icon of manifest.icons) {
    const response = await page.request.get(new URL(icon.src, manifestResponse.url()).href);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
  }

  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state)).toBe('activated');
  expect(await page.evaluate(() => new URL(navigator.serviceWorker.controller!.scriptURL).pathname)).toBe('/sw.js');
});

test('준비한 네 경로와 마블 레이스를 오프라인에서 실행한다', async ({ page, context }) => {
  const routes = [
    ['/', '게임 선택'],
    ['/stopwatch', '스톱워치'],
    ['/ladder', '사다리 타기'],
    ['/marble', '마블 룰렛'],
  ] as const;
  for (const [path, title] of routes) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    if (path === '/') await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  }
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  try {
    await context.setOffline(true);
    for (const [path, title] of routes) {
      const response = await page.goto(path);
      expect(response?.fromServiceWorker()).toBe(true);
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    }

    // 경로 화면뿐 아니라 별도 WASM을 사용하는 실제 게임도 캐시만으로 시작해야 한다.
    await page.getByRole('textbox', { name: '참가자 1 이름' }).fill('짱구');
    await page.getByRole('textbox', { name: '참가자 2 이름' }).fill('철수');
    await page.getByRole('button', { name: '레이스 시작' }).click();
    await expect(page.locator('.marble-race')).toHaveAttribute('aria-busy', 'false');
    await page.getByLabel('마블 레이스 코스').hover();
    await page.mouse.down();
    await expect(page.getByLabel('도착 진행')).toHaveText('도착 2 / 2', { timeout: 20_000 });
  } finally {
    await context.setOffline(false);
    await page.mouse.up();
  }
});
