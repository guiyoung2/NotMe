import { useRegisterSW } from 'virtual:pwa-register/react';

export function ReloadPrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <button className="reload-prompt" type="button" onClick={() => updateServiceWorker(true)}>
      새 버전 적용
    </button>
  );
}
