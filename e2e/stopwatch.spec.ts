import { expect, test, type Page } from '@playwright/test';

async function measureTwice(page: Page, durations: number[]) {
  for (const duration of durations) {
    await page.getByRole('button', { name: '시작' }).click();
    await page.waitForTimeout(duration);
    await page.getByRole('button', { name: '멈추기' }).click();
  }
}

test('두 참가자의 두 번 측정 뒤 각 점수와 선택 결과를 표시한다', async ({ page }) => {
  await page.goto('/stopwatch');
  await page.getByRole('textbox', { name: '참가자 1' }).fill('짱구');
  await page.getByRole('textbox', { name: '참가자 2' }).fill('철수');
  await page.getByRole('button', { name: '게임 시작' }).click();

  await measureTwice(page, [31, 53]);
  await expect(page.getByRole('heading', { name: '철수 차례예요' })).toBeVisible();
  await measureTwice(page, [71, 93]);

  const selectedPlayer = page.getByRole('heading', { name: /님이 선택됐어요/ });
  for (const durations of [[29, 47], [71, 101], [127, 163], [191, 223]]) {
    if (await selectedPlayer.isVisible()) break;
    await expect(page.getByRole('heading', { name: /차례예요$/ })).toBeVisible();
    await measureTwice(page, durations);
  }

  await expect(selectedPlayer).toBeVisible();
  const scores = page.getByRole('list', { name: '전체 점수' }).getByRole('listitem');
  await expect(scores).toHaveCount(2);
  await expect(scores.nth(0)).toHaveText(/짱구 \d × \d = \d+/);
  await expect(scores.nth(1)).toHaveText(/철수 \d × \d = \d+/);
});
