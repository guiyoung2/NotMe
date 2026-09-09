# NotMe

NotMe는 모임에서 한 대의 휴대폰으로 참가자나 결과를 정하는 벌칙·추첨 게임 PWA입니다.
PC에서도 사용할 수 있으며, 회원가입 없이 홈에서 게임을 선택하고 각 게임 안에서 참가자를 입력합니다.
React, TypeScript, Vite로 만든 정적 웹 앱입니다.

## 게임 사용법

모든 게임은 참가자 두 명 이상으로 시작합니다.

- 스톱워치: 사람마다 두 번 시작·멈추기를 합니다. 각 기록의 1/100초 마지막 숫자를 곱해 가장 낮은 점수를 받은 사람을 선택합니다. 최저 점수가 같으면 동점자만 다시 측정합니다.
- 사다리 타기: 사다리 수에 맞춰 이름과 결과를 입력합니다. 결과는 자유롭게 쓰거나 `벌칙` 하나와 나머지 `통과`로 채울 수 있습니다. 이름을 누르면 개별 경로가 공개되고, `전체 결과 보기`로 모두 확인할 수 있습니다.
- 마블 룰렛: 참가자별 구슬 수를 정하고 한 판에 최대 100개로 진행합니다. 구슬의 크기와 무게는 같으며, 당첨 구슬은 `첫 번째` 또는 `마지막`을 선택합니다. `구슬 섞기`는 시작 위치를 섞고, `스킬 사용`은 모든 구슬에 같은 조건으로 적용됩니다. 코스를 누르고 있는 동안 4배속으로 진행합니다.

마블 룰렛은 구슬의 색과 이름, 미니맵을 표시합니다. 도착 명단과 `도착 수 / 전체 수`는 계속 표시되며,
명단을 위아래로 스크롤할 수 있습니다. 조작을 멈추면 최신 도착 항목을 따라갑니다.
완주 후에도 코스를 남기고 그 아래에 당첨자와 전체 도착 순위를 표시합니다.

스톱워치와 사다리는 `설정 변경`으로 입력값을 유지한 채 돌아가거나 같은 인원·설정으로 재경기할 수 있습니다.
마블의 `다시 하기`는 기존 설정 화면으로 돌아갑니다.
상단의 `초기화`나 `홈으로` 이동을 확정하면 현재 판의 입력과 진행 내용이 삭제됩니다.
마블 레이스 도중 새로고침하면 설정을 복구하며 레이스는 다시 시작해야 합니다.

## 로컬 실행과 검증

Node.js 22.12 이상과 npm이 설치된 환경에서 저장소 루트에서 실행합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소로 접속합니다. 개발 서버는 `Ctrl+C`로 종료합니다.

전체 검증에는 Chromium이 필요합니다. 처음에는 아래 설치 명령을 한 번 실행합니다.

```bash
npx playwright install chromium
npm run verify
```

`verify`는 TypeScript 검사, 단위 테스트, production 빌드와 진단 정보 비노출 검사,
모바일 크기·데스크톱 Chromium 브라우저 테스트를 실행합니다.
브라우저 검사는 세 게임, 100구슬 완주, PWA 설치 요건과 오프라인 동작을 포함합니다.

배포용 빌드와 로컬 미리보기는 다음과 같습니다.

```bash
npm run build
npm run preview
```

배포 파일은 `dist/`에 생성됩니다. `verify`는 마지막에 E2E 진단용 빌드를 만들므로,
산출물을 직접 배포할 때는 `npm run build`를 다시 실행합니다.

## Vercel 직접 배포

Vercel 대시보드에서 이 Git 저장소를 Import하고 다음 설정을 확인한 뒤 직접 배포합니다.
이미 연결한 프로젝트도 같은 설정을 사용합니다.

- Framework Preset: `Vite`
- Root Directory: 저장소 루트
- Build Command: `npm run build`
- Output Directory: `dist`

별도 API 키나 환경 변수는 필요하지 않습니다. 테스트 전용 `VITE_E2E`는 배포 환경에 설정하지 않습니다.

`vercel.json`의 SPA rewrite가 `/stopwatch`, `/ladder`, `/marble` 같은
경로의 직접 접속과 새로고침에도 `index.html`을 제공해 앱을 열어 줍니다.
저장소의 빌드·검증 명령은 Vercel 계정 연결이나 실제 배포를 수행하지 않습니다.
자세한 설정은 [Vercel의 Vite 배포 안내](https://vercel.com/docs/frameworks/frontend/vite)를 참고하세요.

## 홈 화면에 추가하고 오프라인으로 사용하기

배포된 HTTPS 주소를 휴대폰 브라우저에서 연 뒤 설치합니다.

- iPhone Safari: 공유 메뉴 → `홈 화면에 추가` → `추가`. `웹 앱으로 열기`가 보이면 활성화합니다. ([Apple 안내](https://support.apple.com/ko-kr/guide/iphone/iph42ab2f3a7/ios))
- Android Chrome: 더보기 메뉴 → `설치 및 바로가기 만들기` → `설치`를 누르고 안내를 따릅니다. 브라우저 버전에 따라 `홈 화면에 추가`로 표시될 수 있습니다. ([Chrome 안내](https://support.google.com/chrome/answer/9658361?hl=ko&co=GENIE.Platform%3DAndroid))

첫 온라인 접속에서 필요한 파일을 내려받은 뒤에는 홈과 세 게임을 오프라인으로 사용할 수 있습니다.
새 버전이 준비되면 홈에 표시되는 `새 버전 적용`을 눌러 갱신합니다.
이전 화면이 계속 보인다면 인터넷에 연결한 상태로 앱을 다시 열고 홈의 갱신 안내를 확인하세요.

## 라이선스

마블 룰렛에 참고하거나 수정한 [lazygyu/roulette](https://github.com/lazygyu/roulette)은
MIT License를 따릅니다. 참고 범위와 라이선스 전문은
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)와
[원 저작권 고지가 포함된 MIT 전문](LICENSES/lazygyu-roulette-MIT.txt)에 있습니다.
배포 앱에도 `/THIRD_PARTY_NOTICES.md`와 `/licenses/lazygyu-roulette-MIT.txt`가 포함됩니다.
