# NotMe

모임에서 사용할 수 있는 벌칙·추첨 게임 PWA입니다.

## Vercel 직접 배포

Vercel 대시보드에서 이 Git 저장소를 Import한 뒤 Build Command를
`npm run build`, Output Directory를 `dist`로 확인하고 직접 배포합니다.
이미 연결한 프로젝트는 같은 설정을 확인하면 됩니다.

`vercel.json`의 SPA rewrite가 `/stopwatch`, `/ladder`, `/marble` 같은
경로의 직접 접속과 새로고침에도 `index.html`을 제공해 앱을 열어 줍니다.
저장소의 빌드·검증 명령은 Vercel 계정 연결이나 실제 배포를 수행하지 않습니다.

## 라이선스

마블 룰렛에 참고하거나 수정한 [lazygyu/roulette](https://github.com/lazygyu/roulette)은
MIT License를 따릅니다. 참고 범위와 라이선스 전문은
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 안내되어 있습니다.
