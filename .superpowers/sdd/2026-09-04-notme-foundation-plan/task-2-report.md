# Task 2 보고서: 홈과 게임 라우팅

## 구현 내용

- `HomePage`에 `NOT ME`, `게임 선택`, 세 게임의 링크와 설명을 추가했다.
- `App`에 `BrowserRouter`와 `/`, `/stopwatch`, `/ladder`, `/marble` 라우트를 연결했다.
- 게임 경로는 전달받은 제목을 표시하는 `PlaceholderGamePage`를 렌더링한다.
- 홈 링크의 경로 계약을 테이블 기반 테스트로 검증했다.

## RED/GREEN 증거

- RED: `npm test -- src/app/App.test.tsx` 실행에서 링크가 존재하지 않아 3개 테스트가 실패했다.
- GREEN: 구현 후 전체 테스트에서 4개 테스트가 통과했다.
- 중간에 테스트 DOM 정리 부재로 테이블 케이스가 누적되는 문제를 발견해 `afterEach(cleanup)`으로 테스트 격리를 보완했다.
- React 19 타입 정의에서 전역 `JSX` 네임스페이스를 제공하지 않는 빌드 오류는 `type JSX` import로 해결했다.

## 테스트 명령과 결과

- `npm test`, `npm run build`, `npm run lint`, `git diff --check`를 실행했다.
- 모두 종료 코드 0으로 통과했다.

## 변경 파일

- `src/app/App.tsx`
- `src/app/HomePage.tsx`
- `src/app/PlaceholderGamePage.tsx`
- `src/app/App.test.tsx`

## 자체 리뷰

- 명세의 네 경로와 세 게임명·설명을 대조해 일치함을 확인했다.
- 링크는 실제 `Link` 컴포넌트를 사용하며, 테스트가 각 `href`를 검증한다.
- 범위 밖인 웜 다크 스타일, 44px 터치 규칙, `/NotMe/` base, PWA 오프라인 변경은 포함하지 않았다.

## 우려 사항

- 없음. 스타일과 배포 base/PWA는 후속 Task 범위다.
