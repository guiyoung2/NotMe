# NotMe 통합과 배포 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 세 게임의 공통 동작, 모바일 성능, PWA 오프라인 실행과 Vercel 직접 배포 준비를 검증해 MVP를 출시 가능한 상태로 만든다.

**Architecture:** Playwright가 실제 production build를 대상으로 핵심 사용자 흐름과 오프라인 동작을 검사한다. Vercel용 SPA deep link는 이후 `vercel.json` rewrite로 `index.html`을 제공하도록 검증한다. 사용자가 Vercel 프로젝트를 직접 연결해 배포하며, 이 계획은 실제 연결이나 배포를 수행하지 않는다.

**Tech Stack:** Vitest, Playwright, Vite PWA, Vercel

**Spec:** `docs/superpowers/specs/2026-09-04-notme-mvp-design.md`

## Global Constraints

- 모바일과 데스크톱에서 세 게임이 설정부터 결과까지 완료되어야 한다.
- 정상적인 홈 이동과 초기화는 현재 판을 삭제하며 새로고침은 유효한 현재 판을 복구한다.
- 룰렛 100개 구슬이 단일 긴 코스를 완주해야 한다.
- 첫 접속 후 오프라인에서 홈과 세 게임 경로를 열 수 있어야 한다.
- MIT 고지가 저장소와 배포 결과에 포함되어야 한다.

---

## File Structure

- `playwright.config.ts` — production preview와 모바일·데스크톱 프로젝트
- `e2e/navigation.spec.ts` — 홈, 게임 경로, 초기화와 이탈 확인
- `e2e/stopwatch.spec.ts` — 두 측정과 동점 흐름
- `e2e/ladder.spec.ts` — 설정과 개별·전체 공개
- `e2e/marble.spec.ts` — 설정, 배속, 결과와 100구슬 완주
- `e2e/pwa.spec.ts` — Manifest, 서비스 워커와 오프라인 경로
- `src/vite-env.d.ts` — E2E 전용 읽기 스냅샷 타입
- `vercel.json` — Vercel SPA deep link rewrite
- `README.md` — 개발·테스트·배포·라이선스 안내

### Task 1: production build 브라우저 테스트 기반

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/navigation.spec.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `npm run build`, `npm run preview`
- Produces: `npm run test:e2e`; mobile Safari 크기와 desktop Chromium 프로젝트

- [ ] **Step 1: Playwright를 설치하고 스크립트를 추가한다**

Run:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

```json
"test:e2e": "playwright test",
"verify": "npm run lint && npm test && npm run build && npm run test:e2e"
```

- [ ] **Step 2: 홈 경로 실패 테스트를 작성한다**

```ts
import { expect, test } from '@playwright/test';

test('홈에서 세 게임으로 이동할 수 있다', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '게임 선택' })).toBeVisible();
  await page.getByRole('link', { name: /스톱워치/ }).click();
  await expect(page).toHaveURL(/\/stopwatch$/);
});
```

Run: `npm run build && npm run test:e2e -- e2e/navigation.spec.ts`
Expected: 첫 실행에서는 Playwright webServer 또는 baseURL이 없어 FAIL.

- [ ] **Step 3: Playwright production preview를 구성한다**

`playwright.config.ts`의 `webServer.command`는 `npm run preview -- --host 127.0.0.1 --port 4173`, `baseURL`은 `http://127.0.0.1:4173`으로 둔다. 프로젝트는 390×844 touch viewport와 1280×800 desktop viewport를 사용한다.

- [ ] **Step 4: 경로 테스트를 실행한다**

Run: `npm run build && npm run test:e2e -- e2e/navigation.spec.ts`
Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add package.json package-lock.json playwright.config.ts e2e/navigation.spec.ts
git commit -m "production 빌드 브라우저 테스트 기반 추가"
```

### Task 2: 세 게임 핵심 흐름 브라우저 테스트

**Files:**
- Create: `e2e/stopwatch.spec.ts`
- Create: `e2e/ladder.spec.ts`
- Create: `e2e/marble.spec.ts`
- Modify: `e2e/navigation.spec.ts`

**Interfaces:**
- Consumes: 세 게임 경로와 접근 가능한 label·button 이름
- Produces: 설정→진행→결과와 홈 초기화 회귀 테스트

- [ ] **Step 1: 스톱워치 흐름을 작성한다**

실제 시작·멈추기 버튼을 각각 두 번 눌러 짱구·철수의 측정을 완료하고, 각 사람의 두 숫자와 곱 및 최종 결과가 표시되는지 검사한다. 정확한 숫자 계산과 동점 재대결은 결정적인 reducer 단위 테스트가 담당하므로 브라우저 테스트는 특정 시간값이나 특정 당첨자를 가정하지 않는다.

- [ ] **Step 2: 사다리 흐름을 작성한다**

두 이름과 두 결과를 입력하고 시작한다. 참가자 하나를 눌러 결과 한 개만 공개되는지, `전체 결과 보기` 뒤 두 결과가 보이는지 검사한다. 결과 텍스트의 순서는 난수에 의존하지 않고 공개된 개수와 입력 결과 집합으로 검증한다.

- [ ] **Step 3: 룰렛 UI 흐름을 작성한다**

참가자 2명, 구슬 수 2와 1을 입력해 총 3개가 표시되는지 검사한다. 100개에서 시작 가능하고 101개에서 안내와 비활성 버튼이 보이는지 검사한다. Canvas pointerdown 뒤 개발용 engine snapshot 속도가 4, pointerup 뒤 1인지 확인한다.

- [ ] **Step 4: 홈과 초기화 수명을 작성한다**

각 게임에서 데이터를 입력한 뒤 홈 이동을 확인하고 같은 게임에 재진입했을 때 기본 설정인지 검사한다. 새로고침에서는 입력이나 설정이 복구되는지 별도 검사한다.

- [ ] **Step 5: 브라우저 테스트를 실행한다**

Run: `npm run build && npm run test:e2e -- e2e/navigation.spec.ts e2e/stopwatch.spec.ts e2e/ladder.spec.ts e2e/marble.spec.ts`
Expected: PASS in mobile and desktop projects.

- [ ] **Step 6: 커밋한다**

```bash
git add e2e src
git commit -m "세 게임 핵심 사용자 흐름 검증"
```

### Task 3: 100구슬 완주와 모바일 성능

**Files:**
- Modify: `src/features/marble/engine/RouletteEngine.ts`
- Modify: `src/features/marble/MarbleRace.tsx`
- Modify: `src/vite-env.d.ts`
- Modify: `e2e/marble.spec.ts`

**Interfaces:**
- Consumes: development/test에서만 노출하는 `window.__NOTME_RACE_DEBUG__`
- Produces: 100구슬 완주, frame duration과 정체 구슬 진단

- [ ] **Step 1: 100구슬 완주 실패 테스트를 추가한다**

```ts
test('100개 구슬이 제한 시간 안에 순위를 확정한다', async ({ page }) => {
  await page.goto('/marble');
  await page.getByLabel('참가자 1 구슬 수').fill('50');
  await page.getByLabel('참가자 2 구슬 수').fill('50');
  await page.getByRole('button', { name: '레이스 시작' }).click();
  await page.getByTestId('marble-canvas').dispatchEvent('pointerdown');
  await expect.poll(() => page.evaluate(() => window.__NOTME_RACE_DEBUG__?.finishedCount ?? 0), { timeout: 60_000 }).toBe(100);
});
```

Run: `npm run build && npm run test:e2e -- e2e/marble.spec.ts`
Expected: FAIL until debug snapshot and stable completion exist.

- [ ] **Step 2: test build 진단 스냅샷을 추가한다**

`VITE_E2E=true`일 때만 `finishedCount`, `activeCount`, `speed`, 최근 120개 frame duration을 읽기 전용 객체로 노출한다. `src/vite-env.d.ts`에 동일한 `Window.__NOTME_RACE_DEBUG__` 타입을 선언한다. production 기본 빌드에서는 전역 키를 만들지 않는다.

- [ ] **Step 3: 완주 정체와 렌더 비용을 조정한다**

실패 시 코스 좌표를 바꾸기 전에 정체 ID와 위치를 기록한다. 완주 시간이 60초를 넘으면 기록된 정체 위치와 직접 맞닿은 장애물 간격만 10% 넓히고 같은 테스트를 다시 실행한다. frame duration p95가 32ms를 넘으면 화면 밖 구슬과 장애물 렌더를 건너뛰되 미니맵은 전체를 그린다. 정체 해소 임계값은 3초를 유지한다.

- [ ] **Step 4: 성능 검증을 반복 실행한다**

Run: `VITE_E2E=true npm run build && npm run test:e2e -- e2e/marble.spec.ts --repeat-each=3`
Expected: 세 번 모두 완주 PASS, p95 ≤ 32ms.

- [ ] **Step 5: 커밋한다**

```bash
git add src/features/marble e2e/marble.spec.ts
git commit -m "100구슬 모바일 완주 성능 검증"
```

### Task 4: 오프라인과 설치 검증

**Files:**
- Create: `e2e/pwa.spec.ts`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: Manifest, service worker, cached route assets
- Produces: 설치 요건과 오프라인 경로 회귀 테스트

- [ ] **Step 1: Manifest와 service worker 테스트를 작성한다**

```ts
test('설치 정보와 서비스 워커를 제공한다', async ({ page }) => {
  await page.goto('/');
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifest).toBeTruthy();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
});
```

- [ ] **Step 2: 오프라인 경로 테스트를 작성한다**

온라인에서 홈과 세 게임 경로를 한 번 연 뒤 `context.setOffline(true)`로 전환한다. `/`, `/stopwatch`, `/ladder`, `/marble`을 차례로 열어 제목이 표시되는지 확인하고 테스트 종료 전에 반드시 offline을 해제한다.

- [ ] **Step 3: 캐시 누락을 수정한다**

Workbox glob이 HTML, JS, CSS, PNG, SVG, WASM을 포함하도록 `globPatterns`를 `['**/*.{html,js,css,png,svg,wasm}']`로 설정한다. navigation fallback은 Vercel 루트 기준 `index.html`을 사용한다.

- [ ] **Step 4: PWA 검사를 실행한다**

Run: `npm run build && npm run test:e2e -- e2e/pwa.spec.ts`
Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add e2e/pwa.spec.ts vite.config.ts
git commit -m "PWA 설치와 오프라인 실행 검증"
```

### Task 5: Vercel 직접 배포 준비

**Files:**
- Create: `vercel.json`
- Modify: `README.md`

**Interfaces:**
- Consumes: `npm run verify`, `dist/`
- Produces: Vercel SPA rewrite 검증과 사용자 직접 연결 안내

- [ ] **Step 1: Vercel SPA rewrite를 작성한다**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

`vercel.json`은 `/stopwatch`, `/ladder`, `/marble` 같은 deep link에 앱 셸을 반환한다.

- [ ] **Step 2: SPA rewrite를 검증한다**

Run: `npm run build && node -e "const config = require('./vercel.json'); if (config.rewrites?.[0]?.source !== '/(.*)' || config.rewrites[0].destination !== '/index.html') process.exit(1)"`

Expected: production build와 Vercel SPA rewrite 설정이 통과한다. 이 단계에서는 실제 Vercel 배포를 실행하지 않는다.

- [ ] **Step 3: 사용자의 Vercel 직접 연결 방법을 안내한다**

README에 사용자가 Vercel 대시보드에서 저장소를 Import하고 Build Command를 `npm run build`, Output Directory를 `dist`로 확인하는 절차와 `vercel.json`이 deep link를 처리한다는 내용을 기록한다. 이 계획이나 자동화는 Vercel 계정을 연결하거나 실제 배포하지 않는다.

- [ ] **Step 4: Vercel 설정과 루트 경로를 검사한다**

Run: `npm run build && node -e "const fs = require('node:fs'); const manifest = JSON.parse(fs.readFileSync('dist/manifest.webmanifest', 'utf8')); if (manifest.start_url !== '/' || manifest.scope !== '/') process.exit(1)"`

Expected: Manifest가 `/` 기준이다.

- [ ] **Step 5: 커밋한다**

```bash
git add vercel.json README.md
git commit -m "Vercel 직접 배포 준비 추가"
```

### Task 6: 출시 문서와 최종 검증

**Files:**
- Modify: `README.md`
- Modify: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consumes: 모든 실행·검사·배포 명령
- Produces: 로컬 실행, 테스트, 설치, 배포, 라이선스 안내

- [ ] **Step 1: README를 완성한다**

README에 프로젝트 목적, 세 게임 규칙 요약, `npm install`, `npm run dev`, `npm run verify`, production build, 사용자의 Vercel 직접 연결 방법, PWA 홈 화면 추가 방법과 제3자 라이선스 링크를 작성한다. 실제 배포는 사용자가 Vercel에서 직접 수행한다.

- [ ] **Step 2: 전체 자동 검증을 실행한다**

Run: `npm run verify`
Expected: typecheck, 모든 Vitest, production build, mobile·desktop Playwright PASS.

- [ ] **Step 3: Git 상태와 라이선스를 검사한다**

Run: `git diff --check && git status --short && rg -n "LazyGyu|MIT" README.md THIRD_PARTY_NOTICES.md LICENSES/lazygyu-roulette-MIT.txt`
Expected: diff 오류 없음, 의도하지 않은 파일 없음, 세 라이선스 파일에서 고지 확인.

- [ ] **Step 4: 커밋한다**

```bash
git add README.md THIRD_PARTY_NOTICES.md
git commit -m "NotMe 사용법과 배포 문서 완성"
```
