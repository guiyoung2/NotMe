import { expect, test } from '@playwright/test';

test('홈에서 세 게임으로 이동할 수 있다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '게임 선택' })).toBeVisible();
  await page.getByRole('link', { name: /스톱워치/ }).click();
  await expect(page).toHaveURL(/\/stopwatch$/);
});
