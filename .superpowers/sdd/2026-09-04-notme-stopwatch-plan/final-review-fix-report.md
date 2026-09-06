# 스톱워치 final whole-branch review fix 보고서

## Findings별 변경

### 1. 저장 불가능한 실행 상태와 잘못된 result draft 승인

- `isStopwatchStateShape`가 `startedAt`에 유한 숫자를 허용하던 조건을 제거하고, 저장 draft는 `startedAt === null`일 때만 승인하도록 좁혔다.
- result draft는 모든 참가자의 측정 완료뿐 아니라 현재 `roundPlayerIds` 참가자의 점수를 `lowestPlayerIds`로 계산했을 때 최저점 ID가 정확히 한 개인지도 확인한다.
- 숫자 `startedAt`과 현재 라운드 최저점 동점 result를 각각 거부하는 회귀 테스트를 추가했다.
- 탈락자의 과거 점수가 재대결 승자의 점수와 같아도 현재 라운드에 단독 최저가 있으면 result draft가 유효한 테스트로 비교 범위를 보호했다.

### 2. 1라운드 동점에서 2라운드 result까지 상태 머신 전이

- 세 참가자의 1라운드에서 두 명이 동점 최저가 되고, 해당 두 명만 2라운드에서 재측정한 뒤 단독 최저 참가자가 나오면 `result`로 전이하는 테스트를 추가했다.
- 탈락자의 1라운드 점수를 2라운드 단독 최저점과 같게 구성해, 재대결 판정과 draft 검증이 현재 라운드 참가자만 사용하도록 검증했다.

### 3. 반복 동점에서 3라운드와 최종 선택자까지 화면 흐름

- 두 참가자가 1·2라운드에서 연속 동점인 사용자 흐름을 수행하고 `3라운드` 표시를 확인한 뒤, 3라운드 단독 최저 참가자가 결과 화면의 최종 선택자로 표시되는 통합 테스트를 추가했다.
- 상태 객체의 내부 필드 대신 실제 시작·멈추기 버튼과 화면 결과를 사용해 상태 머신 단위 테스트와 의도를 분리했다.

### 4. StrictMode 초기 draft 로드 계약

- `getItem` 정확히 1회라는 구현 세부 가정을 제거했다.
- `StrictMode`로 렌더한 직후의 초기 load 횟수를 기준으로 잡고, 타이머 시작에 따른 상태 갱신 뒤 추가 load가 발생하지 않는 행위 계약을 검증한다.

## RED/GREEN

- RED 명령: `npm test -- src/features/stopwatch/stopwatchMachine.test.ts src/features/stopwatch/StopwatchPage.test.tsx`
- RED 결과: 2개 파일 중 머신 테스트 파일 실패, 총 34개 중 2개 실패. 숫자 `startedAt` draft와 동점 result draft가 모두 예상 `false` 대신 `true`를 반환했다. 추가한 머신 연속 전이, 화면 3라운드 흐름, StrictMode load 계약은 기존 구현에서도 통과했다.
- GREEN 변경: draft shape의 `startedAt`을 `null`로 제한하고 result의 현재 라운드 최저점 ID 수를 검사했다.
- GREEN 명령: `npm test -- src/features/stopwatch/stopwatchMachine.test.ts src/features/stopwatch/StopwatchPage.test.tsx`
- GREEN 결과: 2개 파일, 34개 테스트 모두 통과.

## 실행 명령과 결과

- `npm test -- src/features/stopwatch`: 3개 파일, 40개 테스트 통과.
- `npm test`: 8개 파일, 73개 테스트 통과.
- `npm run typecheck`: 통과, exit code 0.
- `npm run build`: 통과, Vite 35개 모듈 변환 및 PWA service worker 생성, exit code 0.
- `git diff --check`: 통과, exit code 0.

## 변경 파일

- `src/features/stopwatch/stopwatchMachine.ts`
- `src/features/stopwatch/stopwatchMachine.test.ts`
- `src/features/stopwatch/StopwatchPage.test.tsx`
- `.superpowers/sdd/2026-09-04-notme-stopwatch-plan/final-review-fix-report.md`

## 자체 리뷰

- 제품 코드 변경은 draft 판별자에만 한정했고 reducer와 화면 동작은 변경하지 않았다.
- `startedAt` 숫자를 허용하는 조건을 draft 경계에서 제거했으므로 실행 중 메모리 상태의 `StopwatchState` 타입과 reducer 동작에는 영향이 없다.
- result 검사는 기존에 검증된 고유하고 실제 존재하는 `roundPlayerIds`만 점수 비교에 사용한다.
- 변이 검토: `startedAt` 숫자 허용을 복원하면 숫자 회귀 테스트가, result 단독 최저 검사를 제거하면 동점 result 테스트가, 전체 참가자를 비교하면 탈락자와 재대결 승자의 점수가 같은 머신 테스트의 draft 유효성 assertion이 실패한다.
- 테스트 헬퍼는 실제 reducer 및 사용자 이벤트를 반복 호출할 뿐 판정 로직이나 기대값을 재구현하지 않는다.

## 우려

- 화면 반복 동점 흐름은 jsdom에서 검증했다. 실제 모바일 브라우저의 프레임·백그라운드 전환 시각 차이는 기존과 같이 별도 실기기 검증 범위다.
- 각 npm 명령 시작 시 로컬 RVM 초기화의 `ps: operation not permitted` 경고가 출력됐지만, 테스트·타입 검사·빌드 자체는 모두 exit code 0으로 완료됐다.
