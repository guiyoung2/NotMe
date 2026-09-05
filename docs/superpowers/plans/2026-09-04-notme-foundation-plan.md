# NotMe 앱 기반 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 모바일 우선 React/Vite PWA 셸, 웜 다크 홈, 게임 라우팅과 게임별 임시 복구 기반을 만든다.

**Architecture:** 앱 셸은 홈과 게임 경로만 조합하고 게임 규칙을 알지 못한다. 각 게임은 `GameShell`을 사용하며 직렬화 가능한 현재 판만 `draftStorage`에 저장한다. PWA는 정적 빌드와 동일 출처 리소스만 사전 캐시한다.

**Tech Stack:** Node.js 24, React, TypeScript, Vite, React Router, Vitest, Testing Library, vite-plugin-pwa, CSS

**Spec:** `docs/superpowers/specs/2026-09-04-notme-mvp-design.md`

## Global Constraints

- 모바일 세로 화면과 한 손 조작을 우선하며 주요 터치 영역은 최소 44×44 CSS 픽셀이다.
- 기본 테마는 짙은 갈색 배경과 주황 강조색의 웜 다크다.
- 서버, 로그인, 데이터베이스와 앱 공통 참가자 명단을 만들지 않는다.
- 게임 상태는 서로 공유하지 않으며 홈으로 이동하거나 초기화하면 현재 판과 복구 데이터를 삭제한다.
- Vercel 루트 경로(`/`)와 오프라인 실행을 지원한다.

---

## File Structure

- `package.json` — 실행, 검사, 테스트, 빌드 스크립트와 의존성
- `vite.config.ts` — React, Vitest, PWA와 `/` 기본 경로
- `src/main.tsx` — React 진입점
- `src/app/App.tsx` — 브라우저 라우터와 네 경로
- `src/app/HomePage.tsx` — 미니멀 목록형 게임 선택 홈
- `src/app/GameShell.tsx` — 공통 상단 바, 초기화와 홈 이탈 확인
- `src/app/PlaceholderGamePage.tsx` — 게임 계획이 구현되기 전 경로 확인용 화면
- `src/app/styles.css` — 웜 다크 토큰과 반응형 공통 스타일
- `src/shared/draftStorage.ts` — 버전이 있는 현재 판 저장·읽기·삭제
- `src/shared/draftStorage.test.ts` — 저장소 손상과 수명 테스트
- `src/test/setup.ts` — DOM 매처 초기화

### Task 1: 실행 가능한 React/Vite 테스트 기반

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/test/setup.ts`
- Create: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `npm run dev`, `npm test`, `npm run typecheck`, `npm run build`; `App(): JSX.Element`

- [ ] **Step 1: 패키지와 TypeScript 설정 파일을 만든다**

`package.json`에 다음 스크립트를 정의하고 패키지를 설치한다.

```json
{
  "name": "not-me",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -b",
    "lint": "tsc -b --pretty false"
  }
}
```

Run:

```bash
npm install react react-dom react-router-dom
npm install -D vite typescript @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @types/react @types/react-dom vite-plugin-pwa
```

- [ ] **Step 2: 앱 렌더링 실패 테스트를 작성한다**

```tsx
// src/app/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('NotMe 홈을 렌더링한다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: '게임 선택' })).toBeInTheDocument();
  });
});
```

Run: `npm test -- src/app/App.test.tsx`
Expected: FAIL with `Cannot find module './App'`.

- [ ] **Step 3: 최소 앱 진입점을 구현한다**

```tsx
// src/app/App.tsx
export function App() {
  return <h1>게임 선택</h1>;
}
```

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './app/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
```

`src/test/setup.ts`에서 `@testing-library/jest-dom/vitest`를 import하고, `vite.config.ts`의 `test.environment`를 `jsdom`, `setupFiles`를 `src/test/setup.ts`로 지정한다.

- [ ] **Step 4: 기반 검사를 실행한다**

Run: `npm test -- src/app/App.test.tsx && npm run typecheck && npm run build`
Expected: 모든 명령 PASS, `dist/index.html` 생성.

- [ ] **Step 5: 커밋한다**

```bash
git add package.json package-lock.json tsconfig*.json vite.config.ts index.html src/main.tsx src/test src/app/App.tsx src/app/App.test.tsx
git commit -m "React Vite 프로젝트 기반 구성"
```

### Task 2: 홈과 게임 라우팅

**Files:**
- Create: `src/app/HomePage.tsx`
- Create: `src/app/PlaceholderGamePage.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `App(): JSX.Element`
- Produces: `/`, `/stopwatch`, `/ladder`, `/marble` 경로; `HomePage`; `PlaceholderGamePage({ title })`

- [ ] **Step 1: 홈 링크와 경로 테스트를 추가한다**

```tsx
it.each([
  ['스톱워치', '/stopwatch'],
  ['사다리 타기', '/ladder'],
  ['마블 룰렛', '/marble'],
])('%s 링크가 올바른 경로를 가리킨다', (name, href) => {
  render(<App />);
  expect(screen.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', href);
});
```

Run: `npm test -- src/app/App.test.tsx`
Expected: FAIL because game links do not exist.

- [ ] **Step 2: 홈과 라우터를 구현한다**

`HomePage`는 `NOT ME`, `게임 선택`, 세 개의 `Link`를 렌더링한다. `App`은 `BrowserRouter`와 `Routes`를 사용해 네 경로를 연결한다. 게임 경로에는 제목을 전달한 `PlaceholderGamePage`를 임시로 렌더링한다.

```tsx
const games = [
  { to: '/stopwatch', title: '스톱워치', description: '두 숫자의 곱으로 결정' },
  { to: '/ladder', title: '사다리 타기', description: '결과를 타고 내려가요' },
  { to: '/marble', title: '마블 룰렛', description: '구슬들의 랜덤 레이스' },
] as const;
```

- [ ] **Step 3: 라우팅 테스트와 빌드를 실행한다**

Run: `npm test -- src/app/App.test.tsx && npm run build`
Expected: PASS.

- [ ] **Step 4: 커밋한다**

```bash
git add src/app
git commit -m "게임 선택 홈과 라우팅 추가"
```

### Task 3: 웜 다크 반응형 앱 셸

**Files:**
- Create: `src/app/GameShell.tsx`
- Create: `src/app/GameShell.test.tsx`
- Create: `src/app/styles.css`
- Modify: `src/app/HomePage.tsx`
- Modify: `src/app/PlaceholderGamePage.tsx`

**Interfaces:**
- Consumes: React Router `useNavigate`
- Produces: `GameShell({ title, dirty, onReset, children })`; CSS 토큰 `--color-bg`, `--color-surface`, `--color-accent`

- [ ] **Step 1: 초기화와 홈 확인 테스트를 작성한다**

```tsx
it('진행 중 홈 이동을 취소할 수 있다', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><GameShell title="테스트" dirty onReset={() => {}}>내용</GameShell></MemoryRouter>);
  await user.click(screen.getByRole('button', { name: '홈으로' }));
  expect(screen.getByRole('dialog', { name: '현재 게임을 종료할까요?' })).toBeInTheDocument();
});
```

`@testing-library/user-event`를 개발 의존성으로 추가한다.

Run: `npm test -- src/app/GameShell.test.tsx`
Expected: FAIL because `GameShell` does not exist.

- [ ] **Step 2: 앱 셸을 최소 구현한다**

`dirty`가 `false`면 즉시 홈으로 이동한다. `true`면 네이티브 confirm을 쓰지 않고 접근 가능한 `role="dialog"`를 렌더링한다. 확인 시 `onReset()` 후 `/`로 이동하고 취소 시 현재 화면을 유지한다. 초기화 버튼도 확인 후 `onReset()`만 호출한다.

- [ ] **Step 3: 웜 다크 스타일을 구현한다**

```css
:root {
  --color-bg: #1b1715;
  --color-surface: #29221e;
  --color-border: #3b302a;
  --color-text: #fff7eb;
  --color-muted: #9c8d82;
  --color-accent: #ffb55e;
  color: var(--color-text);
  background: var(--color-bg);
}

button, a, input { min-height: 44px; }
.app { min-height: 100dvh; padding: env(safe-area-inset-top) 16px env(safe-area-inset-bottom); }
.app__content { width: min(100%, 720px); margin: 0 auto; }
```

홈은 세 개의 세로 목록과 게임별 아이콘·설명을 사용한다. 데스크톱에서도 최대 너비 안에 같은 순서를 유지한다.

- [ ] **Step 4: 앱 셸 검사와 빌드를 실행한다**

Run: `npm test -- src/app/GameShell.test.tsx src/app/App.test.tsx && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: 커밋한다**

```bash
git add package.json package-lock.json src/app
git commit -m "웜 다크 공통 게임 셸 구현"
```

### Task 4: 버전이 있는 현재 판 복구 저장소

**Files:**
- Create: `src/shared/draftStorage.ts`
- Create: `src/shared/draftStorage.test.ts`

**Interfaces:**
- Produces: `saveDraft<T>(game: GameId, payload: T): void`; `loadDraft<T>(game: GameId, isPayload: (value: unknown) => value is T): T | null`; `clearDraft(game: GameId): void`; `GameId = 'stopwatch' | 'ladder' | 'marble'`

- [ ] **Step 1: 저장 수명과 손상 데이터 테스트를 작성한다**

```ts
it('버전이 맞는 현재 판을 복구한다', () => {
  const isNamesDraft = (value: unknown): value is { names: string[] } =>
    typeof value === 'object' && value !== null && Array.isArray((value as { names?: unknown }).names);
  saveDraft('stopwatch', { names: ['짱구', '철수'] });
  expect(loadDraft('stopwatch', isNamesDraft)).toEqual({ names: ['짱구', '철수'] });
});

it('손상된 데이터는 삭제하고 null을 반환한다', () => {
  localStorage.setItem('notme:draft:ladder', '{broken');
  expect(loadDraft('ladder', () => true)).toBeNull();
  expect(localStorage.getItem('notme:draft:ladder')).toBeNull();
});
```

Run: `npm test -- src/shared/draftStorage.test.ts`
Expected: FAIL because storage functions do not exist.

- [ ] **Step 2: 저장소를 구현한다**

```ts
export type GameId = 'stopwatch' | 'ladder' | 'marble';
const DRAFT_VERSION = 1;
const keyOf = (game: GameId) => `notme:draft:${game}`;

export function saveDraft<T>(game: GameId, payload: T) {
  localStorage.setItem(keyOf(game), JSON.stringify({ version: DRAFT_VERSION, payload }));
}
```

`loadDraft`는 JSON 파싱, 객체 여부, `version === 1`, `isPayload(payload)`를 모두 통과할 때만 payload를 반환한다. 하나라도 실패하면 키를 삭제하고 `null`을 반환한다. `clearDraft`는 해당 게임 키만 삭제한다.

- [ ] **Step 3: 저장소 테스트를 실행한다**

Run: `npm test -- src/shared/draftStorage.test.ts`
Expected: PASS.

- [ ] **Step 4: 커밋한다**

```bash
git add src/shared
git commit -m "게임별 현재 판 복구 저장소 추가"
```

### Task 5: PWA Manifest와 앱 셸 오프라인 캐시

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `public/icons/icon-maskable-512.png`
- Create: `src/app/ReloadPrompt.tsx`
- Create: `src/app/ReloadPrompt.test.tsx`
- Modify: `src/app/HomePage.tsx`

**Interfaces:**
- Consumes: `virtual:pwa-register/react`
- Produces: 설치 가능한 Manifest; `ReloadPrompt()`

- [ ] **Step 1: 업데이트 안내 테스트를 작성한다**

PWA 등록 훅을 mock해 `needRefresh: true`일 때만 `새 버전 적용` 버튼이 보이고 클릭 시 `updateServiceWorker(true)`가 호출되는지 테스트한다.

Run: `npm test -- src/app/ReloadPrompt.test.tsx`
Expected: FAIL because `ReloadPrompt` does not exist.

- [ ] **Step 2: PWA 설정을 구현한다**

```ts
VitePWA({
  registerType: 'prompt',
  manifest: {
    name: 'NotMe',
    short_name: 'NotMe',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#1b1715',
    theme_color: '#1b1715',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: { navigateFallback: 'index.html' },
})
```

`vite.config.ts`의 `base`는 development와 production 모두 `/`로 설정한다. `ReloadPrompt`는 홈에만 렌더링한다. 따라서 진행 중인 게임 위에 업데이트 버튼이 나타나지 않으며 홈으로 돌아온 뒤 안전하게 새 버전을 적용한다.

- [ ] **Step 3: 설치 자산과 빌드를 검사한다**

Run: `npm test -- src/app/ReloadPrompt.test.tsx && npm run build`
Expected: PASS, `dist/manifest.webmanifest`와 서비스 워커 파일 생성.

- [ ] **Step 4: 커밋한다**

```bash
git add vite.config.ts public src/app package.json package-lock.json
git commit -m "NotMe PWA 설치와 오프라인 기반 추가"
```
