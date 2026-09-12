import { expect, test } from '@playwright/test';

async function fillTwoParticipants(page: import('@playwright/test').Page) {
  await page.getByRole('textbox', { name: '참가자 1 이름' }).fill('짱구');
  await page.getByRole('textbox', { name: '참가자 2 이름' }).fill('철수');
}

test('빌드 설정에 따라 레이스 진단 전역의 노출을 제한한다', async ({ page }) => {
  await page.goto('/marble');
  await fillTwoParticipants(page);
  await page.getByRole('button', { name: '레이스 시작' }).click();
  await expect(page.locator('.marble-race')).toHaveAttribute('aria-busy', 'false');

  const exposed = await page.evaluate(() => '__NOTME_RACE_DEBUG__' in window);
  expect(exposed).toBe(process.env.NOTME_PRODUCTION_CHECK !== 'true');
});

test('세 구슬 설정으로 레이스를 시작하고 Canvas의 누르기 안내를 제공한다', async ({ page }) => {
  await page.goto('/marble');
  await fillTwoParticipants(page);
  await page.getByRole('spinbutton', { name: '참가자 1 구슬 수' }).fill('2');

  await expect(page.getByRole('status', { name: '전체 구슬 수' })).toHaveText('총 3개');
  await page.getByRole('button', { name: '레이스 시작' }).click();

  const canvas = page.getByLabel('마블 레이스 코스');
  await expect(canvas).toBeVisible();
  await expect(page.getByText('누르고 있는 동안 4배속')).toBeVisible();
  await expect(page.getByLabel('도착 진행')).toHaveText('도착 0 / 3');
  await expect(page.getByRole('list', { name: '도착 명단' })).toBeVisible();
  await expect(page.getByText(/위 예상/)).toHaveCount(0);
  await expect(page.locator('.marble-race')).toHaveAttribute('aria-busy', 'false');

  await canvas.hover();
  await page.mouse.down();
  await expect.poll(() => canvas.evaluate((element) => element.hasPointerCapture(1))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__NOTME_RACE_DEBUG__?.speed)).toBe(4);
  await page.mouse.up();
  await expect.poll(() => canvas.evaluate((element) => element.hasPointerCapture(1))).toBe(false);
  await expect.poll(() => page.evaluate(() => window.__NOTME_RACE_DEBUG__?.speed)).toBe(1);

  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__NOTME_RACE_DEBUG__?.speed)).toBe(4);
  await canvas.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
  await expect.poll(() => page.evaluate(() => window.__NOTME_RACE_DEBUG__?.speed)).toBe(1);
  await page.mouse.up();

  await page.mouse.down();
  await expect.poll(() => page.evaluate(() => window.__NOTME_RACE_DEBUG__?.speed)).toBe(4);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect.poll(() => page.evaluate(() => window.__NOTME_RACE_DEBUG__?.speed)).toBe(1);
  await page.mouse.up();

  await page.getByRole('button', { name: '레이스 중단' }).click();
  await expect(page.getByRole('heading', { name: '참가자와 구슬 설정' })).toBeVisible();
  expect(await page.evaluate(() => '__NOTME_RACE_DEBUG__' in window)).toBe(false);
});

test('총 100개는 시작할 수 있고 101개는 안내와 비활성 시작 버튼을 표시한다', async ({ page }) => {
  await page.goto('/marble');
  await fillTwoParticipants(page);
  const count = page.getByRole('spinbutton', { name: '참가자 1 구슬 수' });

  await count.fill('99');
  await expect(page.getByRole('status', { name: '전체 구슬 수' })).toHaveText('총 100개');
  await expect(page.getByRole('button', { name: '레이스 시작' })).toBeEnabled();
  await page.getByRole('button', { name: '레이스 시작' }).click();
  await expect(page.getByLabel('마블 레이스 코스')).toBeVisible();
  await page.getByRole('button', { name: '레이스 중단' }).click();

  await count.fill('100');
  await expect(page.getByRole('status', { name: '전체 구슬 수' })).toHaveText('총 101개');
  await expect(page.getByText('1개 줄여 주세요')).toBeVisible();
  await expect(page.getByRole('button', { name: '레이스 시작' })).toBeDisabled();
});
