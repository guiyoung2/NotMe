import { expect, test } from '@playwright/test';

async function fillTwoParticipants(page: import('@playwright/test').Page) {
  await page.getByRole('textbox', { name: '참가자 1 이름' }).fill('짱구');
  await page.getByRole('textbox', { name: '참가자 2 이름' }).fill('철수');
}

async function expectMobileHudAboveCourse(page: import('@playwright/test').Page) {
  if (page.viewportSize()!.width > 520) return;
  const canvas = (await page.getByLabel('마블 레이스 코스').boundingBox())!;
  const arrivals = (await page.getByRole('region', { name: '확정 도착 순위' }).boundingBox())!;
  const minimap = (await page.getByLabel('전체 코스 미니맵').boundingBox())!;
  const stage = (await page.locator('.marble-race__stage').boundingBox())!;
  expect(arrivals.y + arrivals.height + 8).toBeLessThanOrEqual(canvas.y);
  expect(minimap.y + minimap.height + 8).toBeLessThanOrEqual(canvas.y);
  expect(canvas.y + canvas.height).toBeLessThanOrEqual(stage.y + stage.height);
  expect(canvas.height).toBeGreaterThan(170);
}

async function expectResultCourse(page: import('@playwright/test').Page, total: number) {
  const map = page.getByLabel('마블 레이스 코스');
  await expect(map).toBeVisible();
  await expectMobileHudAboveCourse(page);
  await expect(page.getByLabel('도착 진행')).toHaveText(`도착 ${total} / ${total}`);
  await expect(page.getByRole('list', { name: '도착 명단' }).getByRole('listitem')).toHaveCount(total);
  const mapBounds = (await map.boundingBox())!;
  const winnerBounds = (await page.locator('.marble-result__selected').boundingBox())!;
  expect(mapBounds.y + mapBounds.height).toBeLessThan(winnerBounds.y);
  expect(await map.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let coursePixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] > 100 && pixels[index + 3] > 0) coursePixels++;
    }
    return coursePixels;
  })).toBeGreaterThan(100);
  await expect(page.locator('body')).not.toContainText(/_r_.*participant|위 예상/);
  await expect(page.getByRole('button', { name: '다시 하기' })).toBeVisible();
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

test('스킬을 켠 100개 구슬이 60초 안에 순위를 확정하고 frame p95가 32ms 이하이다', async ({ page }, testInfo) => {
  test.setTimeout(75_000);
  await page.goto('/marble');
  await fillTwoParticipants(page);
  await page.getByRole('spinbutton', { name: '참가자 1 구슬 수' }).fill('50');
  await page.getByRole('spinbutton', { name: '참가자 2 구슬 수' }).fill('50');
  await page.getByRole('switch', { name: '스킬 사용' }).check();

  const startedAt = Date.now();
  await page.getByRole('button', { name: '레이스 시작' }).click();
  await expect(page.locator('.marble-race')).toHaveAttribute('aria-busy', 'false');
  const canvas = page.getByTestId('marble-canvas');
  await expectMobileHudAboveCourse(page);
  await canvas.hover();
  await page.mouse.down();

  const frameDurationsMs: number[] = [];
  const progress: unknown[] = [];
  let lastFrameCount = 0;
  let missedFrames = 0;
  let completionMs = 0;
  let sawArrivalProgress = false;
  const sampleRace = async () => {
    const snapshot = await page.evaluate(() => {
      const debug = window.__NOTME_RACE_DEBUG__;
      return debug ? {
        finishedCount: debug.finishedCount,
        activeCount: debug.activeCount,
        skillActivationCount: debug.skillActivationCount,
        speed: debug.speed,
        frameCount: debug.frameCount,
        frameDurationsMs: debug.frameDurationsMs,
        activeMarbles: debug.activeMarbles,
        arrivalProgress: document.querySelector('[aria-label="도착 진행"]')?.textContent,
      } : null;
    });
    const elapsedMs = Date.now() - startedAt;
    progress.push({ elapsedMs, snapshot });
    if (snapshot) {
      if (/^도착 ([1-9]|[1-9][0-9]) \/ 100$/.test(snapshot.arrivalProgress ?? '')) sawArrivalProgress = true;
      const newFrames = snapshot.frameCount - lastFrameCount;
      missedFrames += Math.max(0, newFrames - snapshot.frameDurationsMs.length);
      if (newFrames > 0) frameDurationsMs.push(...snapshot.frameDurationsMs.slice(-newFrames));
      lastFrameCount = snapshot.frameCount;
      if (snapshot.finishedCount === 100) completionMs = elapsedMs;
    }
    return snapshot;
  };
  try {
    await expect.poll(async () => (await sampleRace())?.skillActivationCount ?? 0, {
      timeout: 5_000,
      intervals: [250],
    }).toBeGreaterThanOrEqual(1);

    await expect.poll(async () => {
      return (await sampleRace())?.finishedCount ?? 0;
    }, { timeout: 60_000, intervals: [250] }).toBe(100);

    const sortedFrames = [...frameDurationsMs].sort((left, right) => left - right);
    const p95Ms = sortedFrames[Math.ceil(sortedFrames.length * 0.95) - 1];
    console.log(JSON.stringify({ project: testInfo.project.name, repeat: testInfo.repeatEachIndex + 1, completionMs, p95Ms, frames: sortedFrames.length, missedFrames }));
    expect(completionMs).toBeLessThanOrEqual(60_000);
    expect(missedFrames).toBe(0);
    expect(frameDurationsMs.length).toBeGreaterThan(120);
    expect(p95Ms).toBeLessThanOrEqual(32);
    expect(sawArrivalProgress).toBe(true);
    expect(await page.evaluate(() => {
      const debug = window.__NOTME_RACE_DEBUG__!;
      return {
        activeCount: debug.activeCount,
        retainedFrames: debug.frameDurationsMs.length,
        readOnly: Object.isFrozen(debug) && Object.isFrozen(debug.frameDurationsMs) && Object.isFrozen(debug.activeMarbles),
        writable: Reflect.set(debug, 'finishedCount', 0),
      };
    })).toEqual({ activeCount: 0, retainedFrames: 120, readOnly: true, writable: false });
    const ranks = page.getByRole('list', { name: '전체 도착 순위' }).getByRole('listitem');
    await expect(ranks).toHaveCount(100);
    await expect(ranks.last()).toContainText('100위');
    await expectResultCourse(page, 100);
    const arrivals = page.getByRole('list', { name: '도착 명단' });
    await expect.poll(() => arrivals.evaluate((list) => list.scrollHeight - list.clientHeight - list.scrollTop)).toBeLessThan(1);
    await arrivals.evaluate((list) => { list.scrollTop = 0; });
    await expect.poll(() => arrivals.evaluate((list) => list.scrollTop)).toBe(0);
    await expect.poll(() => arrivals.evaluate((list) => list.scrollHeight - list.clientHeight - list.scrollTop), { timeout: 3500 }).toBeLessThan(1);
    await page.reload();
    await expectResultCourse(page, 100);
  } finally {
    await page.mouse.up();
    await testInfo.attach('100-marbles-diagnostics', {
      body: JSON.stringify({ completionMs, frameDurationsMs, missedFrames, progress }, null, 2),
      contentType: 'application/json',
    });
  }
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
