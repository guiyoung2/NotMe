import { expect, test } from '@playwright/test';

test('한 참가자 공개 뒤 전체 결과를 입력한 결과 집합으로 표시한다', async ({ page }) => {
  await page.goto('/ladder');
  await page.getByRole('textbox', { name: '참가자 1' }).fill('짱구');
  await page.getByRole('textbox', { name: '결과 1' }).fill('커피');
  await page.getByRole('textbox', { name: '참가자 2' }).fill('철수');
  await page.getByRole('textbox', { name: '결과 2' }).fill('케이크');
  await page.getByRole('button', { name: '게임 시작' }).click();

  const results = page.getByRole('list', { name: '결과' });
  await expect(results.getByRole('button', { name: '결과 1 경로 보기' })).toBeVisible();
  await expect(results.getByRole('button', { name: '결과 2 경로 보기' })).toBeVisible();

  await page.getByRole('button', { name: '짱구 경로 보기' }).click();
  await expect(results.getByRole('button', { name: /^(커피|케이크) 경로 보기$/ })).toHaveCount(1);
  await expect(results.getByRole('button', { name: /결과 [12] 경로 보기/ })).toHaveCount(1);

  await page.getByRole('button', { name: '전체 결과 보기' }).click();
  expect((await results.getByRole('button').allTextContents()).sort()).toEqual(['커피', '케이크']);
});
