import { createContext, useContext, type JSX, type PropsWithChildren } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface ServiceWorkerUpdate {
  needRefresh: boolean;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

const ServiceWorkerUpdateContext = createContext<ServiceWorkerUpdate | null>(null);

export function ServiceWorkerManager({ children }: PropsWithChildren): JSX.Element {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  return (
    <ServiceWorkerUpdateContext.Provider value={{ needRefresh, updateServiceWorker }}>
      {children}
    </ServiceWorkerUpdateContext.Provider>
  );
}

export function ReloadPrompt(): JSX.Element | null {
  const serviceWorkerUpdate = useContext(ServiceWorkerUpdateContext);

  if (!serviceWorkerUpdate?.needRefresh) {
    return null;
  }

  return (
    <button
      className="reload-prompt"
      type="button"
      onClick={() => serviceWorkerUpdate.updateServiceWorker(true)}
    >
      새 버전 적용
    </button>
  );
}
