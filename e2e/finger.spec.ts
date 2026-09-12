import { expect, test, type Locator } from '@playwright/test';

async function sendPointer(field: Locator, pointerId: number, clientX: number, clientY: number) {
  await field.evaluate((element, event) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, ...event }));
  }, { pointerId, clientX, clientY });
}

test('손가락 추첨은 두 포인터 뒤 3초에 결과를 표시하고 다시 시작한다', async ({ page }) => {
  await page.goto('/finger');
  const field = page.getByTestId('finger-touch-field');

  await sendPointer(field, 1, 60, 100);
  await sendPointer(field, 2, 180, 200);

  await expect(page.getByText('그대로 유지하세요')).toBeVisible();
  await expect(page.getByText('선택됐어요!')).toBeVisible({ timeout: 4_000 });

  await page.getByRole('button', { name: '다시 하기' }).click();
  await expect(page.getByText('화면에 손가락을 올려주세요')).toBeVisible();
});

test('최대 10개의 포인터를 참가자로 유지한다', async ({ page }) => {
  await page.goto('/finger');
  const field = page.getByTestId('finger-touch-field');

  for (let pointerId = 1; pointerId <= 10; pointerId += 1) {
    await sendPointer(field, pointerId, pointerId * 24, pointerId * 36);
  }

  await expect(field.locator('.finger-draw-finger')).toHaveCount(10);
});

test('카운트다운 중 참가자가 바뀌면 다시 시작 안내를 표시한다', async ({ page }) => {
  await page.goto('/finger');
  const field = page.getByTestId('finger-touch-field');

  await sendPointer(field, 1, 60, 100);
  await sendPointer(field, 2, 180, 200);
  await sendPointer(field, 3, 260, 300);

  await expect(page.getByText('다시 시작해요')).toBeVisible();
  await expect(page.getByText('손가락을 유지하세요')).toBeVisible();
});
