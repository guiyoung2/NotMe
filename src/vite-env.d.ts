/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

interface Window {
  readonly __NOTME_RACE_DEBUG__?: {
    readonly finishedCount: number;
    readonly activeCount: number;
    readonly skillActivationCount: number;
    readonly speed: 1 | 4;
    readonly frameCount: number;
    readonly frameDurationsMs: readonly number[];
    readonly activeMarbles: readonly Readonly<{ id: string; x: number; y: number }>[];
  };
}
