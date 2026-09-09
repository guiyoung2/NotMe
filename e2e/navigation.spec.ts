import { expect, test, type Page } from '@playwright/test';

async function returnHome(page: Page) {
  await page.getByRole('button', { name: '홈으로' }).click();
  await expect(page.getByRole('heading', { name: '현재 게임을 종료할까요?' })).toBeVisible();
  await page.getByRole('button', { name: '종료' }).click();
  await expect(page.getByRole('heading', { name: '게임 선택' })).toBeVisible();
}

test('홈에서 세 게임으로 이동할 수 있다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '게임 선택' })).toBeVisible();
  await page.getByRole('link', { name: /스톱워치/ }).click();
  await expect(page).toHaveURL(/\/stopwatch$/);
});

test('스톱워치에서 홈으로 나가면 참가자 입력을 지운다', async ({ page }) => {
  await page.goto('/stopwatch');
  await page.getByRole('textbox', { name: '참가자 1' }).fill('짱구');
  await returnHome(page);

  await page.goto('/stopwatch');
  await expect(page.getByRole('textbox', { name: '참가자 1' })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: '참가자 2' })).toHaveValue('');
});

test('사다리에서 홈으로 나가면 참가자와 결과 입력을 지운다', async ({ page }) => {
  await page.goto('/ladder');
  await page.getByRole('textbox', { name: '참가자 1' }).fill('짱구');
  await page.getByRole('textbox', { name: '결과 1' }).fill('커피');
  await returnHome(page);

  await page.goto('/ladder');
  await expect(page.getByRole('textbox', { name: '참가자 1' })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: '결과 1' })).toHaveValue('');
});

test('마블 룰렛에서 홈으로 나가면 참가자 설정을 기본값으로 되돌린다', async ({ page }) => {
  await page.goto('/marble');
  await page.getByRole('textbox', { name: '참가자 1 이름' }).fill('짱구');
  await page.getByRole('spinbutton', { name: '참가자 1 구슬 수' }).fill('2');
  await returnHome(page);

  await page.goto('/marble');
  await expect(page.getByRole('textbox', { name: '참가자 1 이름' })).toHaveValue('');
  await expect(page.getByRole('spinbutton', { name: '참가자 1 구슬 수' })).toHaveValue('1');
});

test('스톱워치는 새로고침 뒤 시작한 게임을 복구한다', async ({ page }) => {
  await page.goto('/stopwatch');
  await page.getByRole('textbox', { name: '참가자 1' }).fill('짱구');
  await page.getByRole('textbox', { name: '참가자 2' }).fill('철수');
  await page.getByRole('button', { name: '게임 시작' }).click();
  await expect(page.getByRole('heading', { name: '짱구 차례예요' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '짱구 차례예요' })).toBeVisible();
});

test('사다리는 새로고침 뒤 시작한 판을 복구한다', async ({ page }) => {
  await page.goto('/ladder');
  await page.getByRole('textbox', { name: '참가자 1' }).fill('짱구');
  await page.getByRole('textbox', { name: '결과 1' }).fill('커피');
  await page.getByRole('textbox', { name: '참가자 2' }).fill('철수');
  await page.getByRole('textbox', { name: '결과 2' }).fill('케이크');
  await page.getByRole('button', { name: '게임 시작' }).click();
  await expect(page.getByRole('button', { name: '짱구 경로 보기' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: '짱구 경로 보기' })).toBeVisible();
});

test('마블 룰렛은 새로고침 뒤 중단된 레이스의 설정을 복구한다', async ({ page }) => {
  await page.goto('/marble');
  await page.getByRole('textbox', { name: '참가자 1 이름' }).fill('짱구');
  await page.getByRole('textbox', { name: '참가자 2 이름' }).fill('철수');
  await page.getByRole('spinbutton', { name: '참가자 1 구슬 수' }).fill('2');
  await page.getByRole('button', { name: '레이스 시작' }).click();
  await expect(page.getByLabel('마블 레이스 코스')).toBeVisible();

  await page.reload();
  await expect(page.getByText('진행 중이던 레이스는 다시 시작해 주세요')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '참가자 1 이름' })).toHaveValue('짱구');
  await expect(page.getByRole('spinbutton', { name: '참가자 1 구슬 수' })).toHaveValue('2');
});
