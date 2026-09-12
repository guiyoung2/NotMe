import { expect, test, type Page } from '@playwright/test';

async function returnHome(page: Page) {
  await page.getByRole('button', { name: '홈으로' }).click();
  await expect(page.getByRole('heading', { name: '현재 게임을 종료할까요?' })).toBeVisible();
  await page.getByRole('button', { name: '종료' }).click();
  await expect(page.getByRole('heading', { name: '게임 선택' })).toBeVisible();
}

async function measureCurrentPlayerTwice(page: Page) {
  for (const duration of [31, 53]) {
    await page.getByRole('button', { name: '시작' }).click();
    await page.waitForTimeout(duration);
    await page.getByRole('button', { name: '멈추기' }).click();
  }
}

async function fillLadderEntries(page: Page) {
  await page.getByRole('button', { name: '사다리 추가' }).click();
  for (const [index, name, outcome] of [
    [1, '짱구', '커피'],
    [2, '철수', '케이크'],
    [3, '유리', '영화'],
  ] as const) {
    await page.getByRole('textbox', { name: `참가자 ${index}` }).fill(name);
    await page.getByRole('textbox', { name: `결과 ${index}` }).fill(outcome);
  }
}

async function fillMarbleSettings(page: Page) {
  await page.getByRole('button', { name: '참가자 추가' }).click();
  for (const [index, name, count] of [
    [1, '짱구', '2'],
    [2, '철수', '3'],
    [3, '유리', '4'],
  ] as const) {
    await page.getByRole('textbox', { name: `참가자 ${index} 이름` }).fill(name);
    await page.getByRole('spinbutton', { name: `참가자 ${index} 구슬 수` }).fill(count);
  }
  await page.getByRole('radio', { name: '마지막' }).check();
  await page.getByRole('switch', { name: '스킬 사용' }).check();
}

test('홈에서 손가락 추첨으로 이동할 수 있다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '게임 선택' })).toBeVisible();
  await page.getByRole('link', { name: /손가락 추첨/ }).click();
  await expect(page).toHaveURL(/\/finger$/);
  await expect(page.getByTestId('finger-touch-field')).toBeVisible();
});

test('스톱워치에서 저장된 게임을 홈으로 종료하면 초기 설정으로 돌아간다', async ({ page }) => {
  await page.goto('/stopwatch');
  await page.getByRole('textbox', { name: '참가자 1' }).fill('짱구');
  await page.getByRole('textbox', { name: '참가자 2' }).fill('철수');
  await page.getByRole('button', { name: '게임 시작' }).click();
  await expect(page.getByRole('heading', { name: '짱구 차례예요' })).toBeVisible();
  await returnHome(page);

  await page.getByRole('link', { name: /스톱워치/ }).click();
  await expect(page.getByRole('textbox', { name: '참가자 1' })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: '참가자 2' })).toHaveValue('');
});

test('사다리에서 홈으로 나가면 모든 참가자와 결과를 기본 두 행으로 되돌린다', async ({ page }) => {
  await page.goto('/ladder');
  await fillLadderEntries(page);
  await returnHome(page);

  await page.getByRole('link', { name: /사다리 타기/ }).click();
  await expect(page.getByRole('status', { name: '현재 사다리 수' })).toHaveText('2개');
  for (const index of [1, 2]) {
    await expect(page.getByRole('textbox', { name: `참가자 ${index}` })).toHaveValue('');
    await expect(page.getByRole('textbox', { name: `결과 ${index}` })).toHaveValue('');
  }
  await expect(page.getByRole('textbox', { name: '참가자 3' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '결과 3' })).toHaveCount(0);
});

test('마블 룰렛에서 홈으로 나가면 모든 참가자와 옵션을 기본값으로 되돌린다', async ({ page }) => {
  await page.goto('/marble');
  await fillMarbleSettings(page);
  await returnHome(page);

  await page.getByRole('link', { name: /마블 룰렛/ }).click();
  await expect(page.getByRole('list', { name: '참가자 목록' }).getByRole('listitem')).toHaveCount(2);
  for (const index of [1, 2]) {
    await expect(page.getByRole('textbox', { name: `참가자 ${index} 이름` })).toHaveValue('');
    await expect(page.getByRole('spinbutton', { name: `참가자 ${index} 구슬 수` })).toHaveValue('1');
  }
  await expect(page.getByRole('textbox', { name: '참가자 3 이름' })).toHaveCount(0);
  await expect(page.getByRole('radio', { name: '첫 번째' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '마지막' })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: '스킬 사용' })).not.toBeChecked();
});

test('스톱워치는 새로고침 뒤 입력한 세 참가자 게임을 복구한다', async ({ page }) => {
  await page.goto('/stopwatch');
  await page.getByRole('button', { name: '참가자 추가' }).click();
  await page.getByRole('textbox', { name: '참가자 1' }).fill('짱구');
  await page.getByRole('textbox', { name: '참가자 2' }).fill('철수');
  await page.getByRole('textbox', { name: '참가자 3' }).fill('유리');
  await page.getByRole('button', { name: '게임 시작' }).click();
  await expect(page.getByRole('heading', { name: '짱구 차례예요' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '짱구 차례예요' })).toBeVisible();
  await measureCurrentPlayerTwice(page);
  await expect(page.getByRole('heading', { name: '철수 차례예요' })).toBeVisible();
  await measureCurrentPlayerTwice(page);
  await expect(page.getByRole('heading', { name: '유리 차례예요' })).toBeVisible();
});

test('사다리는 새로고침 뒤 모든 참가자와 결과를 복구한다', async ({ page }) => {
  await page.goto('/ladder');
  await fillLadderEntries(page);
  await page.getByRole('button', { name: '게임 시작' }).click();
  await expect(page.getByRole('button', { name: '짱구 경로 보기' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: '짱구 경로 보기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '철수 경로 보기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '유리 경로 보기' })).toBeVisible();
  await page.getByRole('button', { name: '전체 결과 보기' }).click();
  expect((await page.getByRole('list', { name: '결과' }).getByRole('button').allTextContents()).sort())
    .toEqual(['커피', '케이크', '영화'].sort());
});

test('마블 룰렛은 새로고침 뒤 모든 참가자와 옵션 설정을 복구한다', async ({ page }) => {
  await page.goto('/marble');
  await fillMarbleSettings(page);
  await page.getByRole('button', { name: '레이스 시작' }).click();
  await expect(page.getByLabel('마블 레이스 코스')).toBeVisible();

  await page.reload();
  await expect(page.getByText('진행 중이던 레이스는 다시 시작해 주세요')).toBeVisible();
  await expect(page.getByRole('list', { name: '참가자 목록' }).getByRole('listitem')).toHaveCount(3);
  for (const [index, name, count] of [
    [1, '짱구', '2'],
    [2, '철수', '3'],
    [3, '유리', '4'],
  ] as const) {
    await expect(page.getByRole('textbox', { name: `참가자 ${index} 이름` })).toHaveValue(name);
    await expect(page.getByRole('spinbutton', { name: `참가자 ${index} 구슬 수` })).toHaveValue(count);
  }
  await expect(page.getByRole('radio', { name: '마지막' })).toBeChecked();
  await expect(page.getByRole('switch', { name: '스킬 사용' })).toBeChecked();
});
